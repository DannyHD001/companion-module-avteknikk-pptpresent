import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'
import { COLORS } from './feedbacks.js'
import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'

type Presets = CompanionPresetDefinitions<ModuleSchema>
type Preset = NonNullable<Presets[string]> & { type: 'simple' }
type Step = Preset['steps'][number]
type Feedbacks = Preset['feedbacks']

/** How many "cue presentation n" buttons to offer. */
const CUE_BUTTONS = 10

export function UpdatePresets(self: ModuleInstance): void {
	const v = (id: string): string => `$(${self.label}:${id})`
	const press = (down: Step['down']): Step => ({ down, up: [] })

	const button = (name: string, text: string, down: Step['down'], feedbacks: Feedbacks = []): Preset => ({
		type: 'simple',
		name,
		// 'auto' is Companion's "Shrink to fit": long names and values never overflow the button.
		style: { text, size: 'auto', color: COLORS.white, bgcolor: COLORS.black },
		steps: [press(down)],
		feedbacks,
	})

	const presets: Presets = {
		// Show
		show_toggle: button(
			'Start / stop the slide show',
			'SHOW',
			[{ actionId: 'show', options: { mode: 'toggle' } }],
			[{ feedbackId: 'show_running', options: {}, style: { bgcolor: COLORS.green, color: COLORS.white } }],
		),
		show_start: button(
			'Start the slide show',
			'START\\nSHOW',
			[{ actionId: 'show', options: { mode: 'start' } }],
			[{ feedbackId: 'show_running', options: {}, style: { bgcolor: COLORS.green, color: COLORS.white } }],
		),
		show_stop: button('Stop the slide show', 'STOP\\nSHOW', [{ actionId: 'show', options: { mode: 'stop' } }]),

		// Slides
		slide_prev: button('Previous slide', '◀\\nPREV', [{ actionId: 'slide_prev', options: {} }]),
		slide_next: button('Next slide', 'NEXT ▶\\n' + v('slide_text'), [{ actionId: 'slide_next', options: {} }]),
		slide_first: button(
			'Go to slide 1',
			'SLIDE\\n1',
			[{ actionId: 'slide_goto', options: { slide: 1 } }],
			[{ feedbackId: 'slide_is', options: { slide: 1 }, style: { bgcolor: COLORS.green, color: COLORS.white } }],
		),
		slide_position: button(
			'Slide position',
			'SLIDE\\n' + v('slide_text'),
			[],
			[{ feedbackId: 'show_running', options: {}, style: { bgcolor: COLORS.green, color: COLORS.white } }],
		),

		// Presentations
		presentation_up: button('Cue the presentation above', '▲\\nCUE', [
			{ actionId: 'presentation_step', options: { direction: 'up' } },
		]),
		presentation_down: button('Cue the presentation below', '▼\\nCUE', [
			{ actionId: 'presentation_step', options: { direction: 'down' } },
		]),
		presentation_take: button(
			'Take the cued presentation',
			'TAKE\\n' + v('presentation_cued'),
			[{ actionId: 'presentation_take', options: {} }],
			[
				{
					feedbackId: 'presentation_cued',
					options: { number: 0 },
					style: { bgcolor: COLORS.amber, color: COLORS.black },
				},
			],
		),
		presentation_name: button('Loaded presentation', v('presentation_name'), [], []),
	}
	const cueIds: string[] = []
	for (let n = 1; n <= CUE_BUTTONS; n++) {
		const id = `presentation_cue_${n}`
		cueIds.push(id)
		presets[id] = button(
			`Cue presentation ${n}`,
			`CUE\\n${n}`,
			[{ actionId: 'presentation_cue', options: { number: n } }],
			[
				{
					feedbackId: 'presentation_loaded',
					options: { number: n },
					style: { bgcolor: COLORS.green, color: COLORS.white },
				},
				{
					feedbackId: 'presentation_cued',
					options: { number: n },
					style: { bgcolor: COLORS.amber, color: COLORS.black },
				},
			],
		)
	}

	// Timer
	presets.timer_display = button(
		'Timer (press to start / stop)',
		v('timer_text'),
		[{ actionId: 'timer', options: { mode: 'toggle' } }],
		[
			{ feedbackId: 'timer_running', options: {}, style: { color: COLORS.green } },
			{ feedbackId: 'timer_state', options: { state: 'warn' }, style: { bgcolor: COLORS.yellow, color: COLORS.black } },
			{ feedbackId: 'timer_state', options: { state: 'over' }, style: { bgcolor: COLORS.red, color: COLORS.white } },
		],
	)
	presets.timer_toggle = button(
		'Start / stop the timer',
		'TIMER\\n⏯',
		[{ actionId: 'timer', options: { mode: 'toggle' } }],
		[{ feedbackId: 'timer_running', options: {}, style: { bgcolor: COLORS.green, color: COLORS.white } }],
	)
	presets.timer_reset = button('Reset the timer', 'TIMER\\nRESET', [{ actionId: 'timer', options: { mode: 'reset' } }])
	const timerAdjust: string[] = []
	for (const secs of [10, 30, 60, -10, -30, -60]) {
		const id = `timer_${secs > 0 ? 'add' : 'sub'}_${Math.abs(secs)}`
		timerAdjust.push(id)
		presets[id] = button(
			`${secs > 0 ? 'Add' : 'Take away'} ${Math.abs(secs)} seconds`,
			`${secs > 0 ? '+' : '−'}${Math.abs(secs)}s`,
			[{ actionId: 'timer_add', options: { seconds: secs } }],
		)
	}
	presets.timer_limit = button('Speaker time', 'LIMIT\\n' + v('timer_limit'), [], [])

	// Outputs
	const outputs = [
		['program', 'PROGRAM'],
		['speaker', 'SPEAKER'],
		['ndi', 'NDI'],
	] as const
	for (const [output, label] of outputs) {
		presets[`output_${output}`] = button(
			`Switch the ${label.toLowerCase()} output`,
			label,
			[{ actionId: 'output', options: { output, state: 'toggle' } }],
			[{ feedbackId: 'output_on', options: { output }, style: { bgcolor: COLORS.green, color: COLORS.white } }],
		)
	}

	// Screens: one button per screen PPTPresent reports, plus a window and off, for each output.
	const screenGroups: { id: string; type: 'simple'; name: string; description: string; presets: string[] }[] = []
	for (const [output, short, long] of [
		['program', 'PROGRAM', 'Program'],
		['speaker', 'SPEAKER', 'Speaker notes'],
	] as const) {
		const ids: string[] = []
		const targets = [
			...self.displays.map((d, i) => ({ screen: d.id, text: `SCREEN ${i + 1}`, name: d.label })),
			{ screen: 'window', text: 'WINDOW', name: 'In a window' },
			{ screen: 'off', text: 'OFF', name: 'Off' },
		]
		for (const t of targets) {
			const id = `screen_${output}_${t.screen}`
			ids.push(id)
			presets[id] = button(
				`${long} on ${t.name}`,
				`${short}\\n${t.text}`,
				[{ actionId: 'output_screen', options: { output, screen: t.screen } }],
				[
					{
						feedbackId: 'output_screen',
						options: { output, screen: t.screen },
						style: { bgcolor: COLORS.green, color: COLORS.white },
					},
				],
			)
		}
		const where = `${output}_where`
		presets[where] = button(`Where the ${long.toLowerCase()} is shown`, v(`output_${output}_screen_name`), [], [])
		ids.push(where)
		screenGroups.push({
			id: `screens_${output}`,
			type: 'simple',
			name: long,
			description: self.displays.length ? 'Green: shown there' : 'The screens appear here once PPTPresent is connected',
			presets: ids,
		})
	}

	// Status
	presets.clock = button('Clock', v('clock'), [], [])
	const connection = button(
		'Connection status (press to refresh)',
		'PPT\\nPRESENT',
		[{ actionId: 'refresh', options: {} }],
		[{ feedbackId: 'connected', options: {}, style: { bgcolor: COLORS.green, color: COLORS.white } }],
	)
	connection.style.bgcolor = COLORS.red // until PPTPresent answers
	presets.connection = connection

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{ id: 'show', name: 'Slide show', definitions: ['show_toggle', 'show_start', 'show_stop'] },
		{ id: 'slides', name: 'Slides', definitions: ['slide_prev', 'slide_next', 'slide_first', 'slide_position'] },
		{
			id: 'presentations',
			name: 'Presentations',
			definitions: [
				{
					id: 'presentation_list',
					type: 'simple',
					name: 'Cue and take',
					description: 'Cue a presentation, then take it to switch to it',
					presets: ['presentation_up', 'presentation_down', 'presentation_take', 'presentation_name'],
				},
				{
					id: 'presentation_cue',
					type: 'simple',
					name: 'Cue by number',
					description: 'Green: loaded. Amber: cued.',
					presets: cueIds,
				},
			],
		},
		{
			id: 'timer',
			name: 'Timer',
			definitions: [
				{
					id: 'timer_main',
					type: 'simple',
					name: 'Timer',
					description: 'Yellow near the end of the speaker time, red when over',
					presets: ['timer_display', 'timer_toggle', 'timer_reset', 'timer_limit'],
				},
				{ id: 'timer_adjust', type: 'simple', name: 'Add or take away time', presets: timerAdjust },
			],
		},
		{ id: 'outputs', name: 'Outputs', definitions: ['output_program', 'output_speaker', 'output_ndi'] },
		{ id: 'screens', name: 'Screens', definitions: screenGroups },
		{ id: 'status', name: 'Status', definitions: ['clock', 'connection'] },
	]

	self.setPresetDefinitions(structure, presets)
}
