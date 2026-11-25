import type { OscValue } from './osc.js'
import type ModuleInstance from './main.js'

export type TimerState = 'normal' | 'warn' | 'over'

export type VariablesSchema = {
	connected: boolean
	show_running: boolean
	slide_index: number
	slide_count: number
	slide_text: string
	presentation_name: string
	presentation_number: number
	presentation_total: number
	presentation_cued: string
	presentation_cued_number: number
	timer_text: string
	timer_running: boolean
	timer_state: TimerState
	timer_limit: string
	clock: string
	video_loaded: boolean
	video_playing: boolean
	video_time: string
	video_remaining: string
	scroll_active: boolean
	scroll_paused: boolean
	scroll_speed: number
	output_program: boolean
	output_speaker: boolean
	output_ndi: boolean
	output_program_screen: number
	output_program_screen_name: string
	output_program_screen_id: string
	output_speaker_screen: number
	output_speaker_screen_name: string
	output_speaker_screen_id: string
	displays_count: number
}

export type VariableId = keyof VariablesSchema

/** Seconds left from a "time left" text like "-2:10" or "-1:02:03"; null when not known. */
export function secondsLeft(text: string): number | null {
	const m = /^-?(?:(\d+):)?(\d+):(\d{2})$/.exec(text.trim())
	if (!m) return null
	return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

/** What PPTPresent knows before any feedback has arrived. */
export const INITIAL_STATE: VariablesSchema = {
	connected: false,
	show_running: false,
	slide_index: 0,
	slide_count: 0,
	slide_text: '',
	presentation_name: '',
	presentation_number: 0,
	presentation_total: 0,
	presentation_cued: '',
	presentation_cued_number: 0,
	timer_text: '',
	timer_running: false,
	timer_state: 'normal',
	timer_limit: '',
	clock: '',
	video_loaded: false,
	video_playing: false,
	video_time: '',
	video_remaining: '',
	scroll_active: false,
	scroll_paused: false,
	scroll_speed: 100,
	output_program: false,
	output_speaker: false,
	output_ndi: false,
	output_program_screen: 0,
	output_program_screen_name: '',
	output_program_screen_id: '',
	output_speaker_screen: 0,
	output_speaker_screen_name: '',
	output_speaker_screen_id: '',
	displays_count: 0,
}

const NAMES: Record<VariableId, string> = {
	connected: 'Connected to PPTPresent (true/false)',
	show_running: 'Slide show running (true/false)',
	slide_index: 'Current slide number (0 when the show is not running)',
	slide_count: 'Number of slides',
	slide_text: 'Slide position, e.g. "3 / 12"',
	presentation_name: 'Loaded presentation',
	presentation_number: 'Place of the loaded presentation in the list (0 if not in it)',
	presentation_total: 'Number of presentations in the list',
	presentation_cued: 'Cued presentation (empty if none)',
	presentation_cued_number: 'Place of the cued presentation in the list (0 if none)',
	timer_text: 'Timer as shown, e.g. "12:34" or "+01:05" when over',
	timer_running: 'Timer running (true/false)',
	timer_state: 'Timer state: normal, warn (near the end) or over',
	timer_limit: 'Speaker time, e.g. "15:00" (empty if none)',
	clock: 'Time of day on the PPTPresent computer, e.g. "14:05"',
	video_loaded: 'The loaded presentation is a video clip (true/false)',
	video_playing: 'The video clip is playing (true/false)',
	video_time: 'Where the video clip is, e.g. "1:05"',
	video_remaining: 'Time left in the video clip, e.g. "-2:10" (empty until known)',
	scroll_active: 'The slide on screen has scrolling text (true/false)',
	scroll_paused: 'The scrolling text is paused (true/false)',
	scroll_speed: 'Scrolling text speed in percent of the speed set in the designer (100 = as designed)',
	output_program: 'Program screen on (true/false)',
	output_speaker: 'Speaker notes screen on (true/false)',
	output_ndi: 'NDI output on (true/false)',
	output_program_screen: 'Number of the screen the program is on (0 in a window or off)',
	output_program_screen_name: 'Name of the screen the program is on, "Window" or "Off"',
	output_program_screen_id: 'Display id of the screen the program is on, "window" or "off"',
	output_speaker_screen: 'Number of the screen the speaker notes are on (0 in a window or off)',
	output_speaker_screen_name: 'Name of the screen the speaker notes are on, "Window" or "Off"',
	output_speaker_screen_id: 'Display id of the screen the speaker notes are on, "window" or "off"',
	displays_count: 'Number of screens connected to the PPTPresent computer',
}

const BOOLEANS = new Set<VariableId>([
	'show_running',
	'timer_running',
	'video_loaded',
	'video_playing',
	'scroll_active',
	'scroll_paused',
	'output_program',
	'output_speaker',
	'output_ndi',
])
const NUMBERS = new Set<VariableId>([
	'slide_index',
	'slide_count',
	'presentation_number',
	'presentation_total',
	'presentation_cued_number',
	'scroll_speed',
	'output_program_screen',
	'output_speaker_screen',
	'displays_count',
])

/**
 * Turns a feedback message from PPTPresent into a variable change, or null if it is not one.
 * "/pptpresent/presentation/cued/number" → presentation_cued_number.
 */
export function feedbackToVariable(prefix: string, address: string, args: OscValue[]): Partial<VariablesSchema> | null {
	if (!address.startsWith(prefix + '/')) return null
	const id = address.slice(prefix.length + 1).replace(/\//g, '_') as VariableId
	if (!(id in NAMES) || id === 'connected') return null
	const raw = args[0]
	if (BOOLEANS.has(id)) {
		const on = typeof raw === 'boolean' ? raw : typeof raw === 'number' ? raw !== 0 : raw === '1' || raw === 'true'
		return { [id]: on }
	}
	if (NUMBERS.has(id)) {
		const n = typeof raw === 'number' ? raw : Number(raw)
		return { [id]: Number.isFinite(n) ? n : 0 }
	}
	if (id === 'timer_state') {
		const s = String(raw ?? 'normal')
		return { timer_state: s === 'warn' || s === 'over' ? s : 'normal' }
	}
	return { [id]: raw === null || raw === undefined ? '' : String(raw) }
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const defs = Object.fromEntries(Object.entries(NAMES).map(([id, name]) => [id, { name }])) as Record<
		VariableId,
		{ name: string }
	>
	self.setVariableDefinitions(defs)
}
