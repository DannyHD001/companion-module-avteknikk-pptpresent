import { isIP } from 'node:net'
import {
	InstanceBase,
	InstanceStatus,
	type SharedUdpSocket,
	type SomeCompanionConfigField,
} from '@companion-module/base'
import { DEFAULT_CONFIG, GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import { INITIAL_STATE, UpdateVariableDefinitions, feedbackToVariable, type VariablesSchema } from './variables.js'
import { decodePacket, encodeMessage } from './osc.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

/** Every PPTPresent address starts with this. */
const PREFIX = '/pptpresent'
/** Ask for all feedback when PPTPresent has been quiet this long (it only sends changes). */
const POLL_AFTER_MS = 10_000
/** Report the connection as lost when PPTPresent has been quiet this long. */
const LOST_AFTER_MS = 25_000
const TICK_MS = 2_000

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config: ModuleConfig = { ...DEFAULT_CONFIG }
	/** Last known PPTPresent state; mutated in place so feedback callbacks always see the latest. */
	readonly state: VariablesSchema = { ...INITIAL_STATE }
	/** Screens connected to the PPTPresent computer, in its order; id is the display id as text. */
	displays: { id: string; label: string }[] = []

	private displayLabels: string[] = []
	private displayIds: string[] = []

	private socket: SharedUdpSocket | null = null
	private timer: NodeJS.Timeout | null = null
	private lastReceived = 0
	private lastPolled = 0
	private startedAt = 0

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = { ...DEFAULT_CONFIG, ...config }
		this.updateVariableDefinitions()
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.setVariableValues(this.state)
		this.connect()
	}

	async destroy(): Promise<void> {
		this.disconnect()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = { ...DEFAULT_CONFIG, ...config }
		// The connection's name may have changed, and presets refer to it.
		this.updatePresets()
		this.connect()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	/** Sends a command to PPTPresent; `path` is without the /pptpresent prefix. */
	send(path: string, args: (number | string)[] = []): void {
		const { host, port } = this.config
		if (!this.socket || !host) {
			this.log('warn', `Not sent, not connected: ${path}`)
			return
		}
		const address = PREFIX + path
		this.log('debug', `Send ${address}${args.length ? ' ' + args.join(' ') : ''} to ${host}:${port}`)
		try {
			this.socket.send(encodeMessage(address, args), port, host)
		} catch (err) {
			this.log('error', `Sending ${address} failed: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	private connect(): void {
		this.disconnect()
		const { host, port, feedbackPort } = this.config
		if (!host || !port || !feedbackPort) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the PPTPresent computer and ports')
			return
		}
		this.updateStatus(InstanceStatus.Connecting, `Waiting for feedback on port ${feedbackPort}`)
		this.startedAt = Date.now()
		this.lastReceived = 0
		this.lastPolled = 0

		// A shared socket, so other connections (another PPTPresent, Generic OSC) can listen on the same port.
		const socket = this.createSharedUdpSocket('udp4', (msg, rinfo) => this.receive(msg, rinfo.address))
		socket.on('error', (err) => {
			this.log('error', `Feedback port ${feedbackPort}: ${err.message}`)
			this.updateStatus(InstanceStatus.UnknownError, `Feedback port ${feedbackPort}: ${err.message}`)
		})
		socket.on('listening', () => this.poll())
		socket.bind(feedbackPort)
		this.socket = socket
		this.timer = setInterval(() => this.tick(), TICK_MS)
	}

	private disconnect(): void {
		if (this.timer) clearInterval(this.timer)
		this.timer = null
		if (this.socket) {
			try {
				this.socket.close()
			} catch {
				// already closed
			}
		}
		this.socket = null
		this.setConnected(false)
	}

	/** Asks PPTPresent for all its feedback values (it also learns where to send them). */
	private poll(): void {
		this.lastPolled = Date.now()
		this.send('/feedback')
	}

	private tick(): void {
		const now = Date.now()
		const quietSince = this.lastReceived || this.startedAt
		if (now - quietSince > LOST_AFTER_MS && (this.state.connected || this.lastReceived === 0)) {
			this.setConnected(false)
			const { host, port, feedbackPort } = this.config
			this.updateStatus(
				InstanceStatus.ConnectionFailure,
				`No reply from ${host}:${port}. Is OSC on in PPTPresent, with feedback to port ${feedbackPort}?`,
			)
		}
		if (now - quietSince > POLL_AFTER_MS && now - this.lastPolled > POLL_AFTER_MS) this.poll()
	}

	/** Only take feedback from the PPTPresent computer, when it is given as an address. */
	private fromOurHost(source: string): boolean {
		const host = this.config.host.trim().toLowerCase()
		const loopback = (a: string): boolean => a.startsWith('127.') || a === '::1' || a === '::ffff:127.0.0.1'
		if (host === 'localhost' || loopback(host)) return loopback(source)
		if (isIP(host) === 0) return true // a name: cannot tell, accept
		return source === host || source === `::ffff:${host}`
	}

	private receive(buf: Buffer, source: string): void {
		if (!this.fromOurHost(source)) return
		let messages
		try {
			messages = decodePacket(buf)
		} catch {
			return // not OSC
		}
		const changes: Partial<VariablesSchema> = {}
		let known = false
		for (const m of messages) {
			const address = m.address.trim().toLowerCase()
			if (address === PREFIX + '/displays') {
				this.displayLabels = m.args.map((a) => String(a ?? ''))
				known = true
			} else if (address === PREFIX + '/displays/ids') {
				this.displayIds = m.args.map((a) => String(a ?? ''))
				known = true
			}
			const change = feedbackToVariable(PREFIX, address, m.args)
			if (change) Object.assign(changes, change)
		}
		if (known) this.updateDisplays()
		if (Object.keys(changes).length === 0 && !known) return

		this.lastReceived = Date.now()
		if (!this.state.connected) {
			this.updateStatus(InstanceStatus.Ok)
			this.setConnected(true)
		}
		const changed = (Object.keys(changes) as (keyof VariablesSchema)[]).filter((k) => this.state[k] !== changes[k])
		if (changed.length === 0) return
		Object.assign(this.state, changes)
		this.setVariableValues(Object.fromEntries(changed.map((k) => [k, this.state[k]])))
		this.checkFeedbacksFor(changed)
	}

	/**
	 * Names and ids come in separate messages; once both lists match, a changed set of screens
	 * redefines the screen choices in actions, feedbacks and presets.
	 */
	private updateDisplays(): void {
		if (this.displayLabels.length !== this.displayIds.length) return
		const next = this.displayIds.map((id, i) => ({ id, label: this.displayLabels[i] }))
		if (JSON.stringify(next) === JSON.stringify(this.displays)) return
		this.displays = next
		this.log('info', `Screens: ${next.map((d) => d.label).join(', ') || 'none'}`)
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.checkFeedbacks('output_screen')
	}

	private setConnected(on: boolean): void {
		if (this.state.connected === on) return
		this.state.connected = on
		this.setVariableValues({ connected: on })
		this.checkFeedbacks('connected')
	}

	private checkFeedbacksFor(changed: (keyof VariablesSchema)[]): void {
		const ids = new Set<keyof FeedbacksSchema>()
		for (const k of changed) {
			if (k === 'show_running') ids.add('show_running').add('slide_is')
			else if (k === 'slide_index') ids.add('slide_is')
			else if (k === 'presentation_number') ids.add('presentation_loaded')
			else if (k === 'presentation_cued_number') ids.add('presentation_cued')
			else if (k === 'timer_running') ids.add('timer_running')
			else if (k === 'timer_state') ids.add('timer_state')
			else if (k === 'video_loaded' || k === 'video_playing')
				ids.add('video_loaded').add('video_playing').add('video_ending')
			else if (k === 'video_remaining') ids.add('video_ending')
			else if (k === 'scroll_active') ids.add('scroll_active').add('scroll_paused').add('scroll_speed_changed')
			else if (k === 'scroll_paused') ids.add('scroll_paused')
			else if (k === 'scroll_speed') ids.add('scroll_speed_changed')
			else if (k.startsWith('output_') && k.includes('_screen')) ids.add('output_screen')
			else if (k.startsWith('output_')) ids.add('output_on')
		}
		const [first, ...rest] = ids
		if (first) this.checkFeedbacks(first, ...rest)
	}
}
