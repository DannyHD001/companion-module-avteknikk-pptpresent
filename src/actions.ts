import type ModuleInstance from './main.js'

export type OutputId = 'program' | 'speaker' | 'ndi'

export const OUTPUT_CHOICES: { id: OutputId; label: string }[] = [
	{ id: 'program', label: 'Program screen' },
	{ id: 'speaker', label: 'Speaker notes screen' },
	{ id: 'ndi', label: 'NDI output' },
]

export type ScreenOutputId = 'program' | 'speaker'

export const SCREEN_OUTPUT_CHOICES: { id: ScreenOutputId; label: string }[] = [
	{ id: 'program', label: 'Program' },
	{ id: 'speaker', label: 'Speaker notes' },
]

/**
 * Screen choices: the screens PPTPresent reports (by display id), then a window and off.
 * A number typed in instead picks that screen of the list.
 */
export function screenChoices(self: ModuleInstance): { id: string; label: string }[] {
	return [
		...self.displays.map((d) => ({ id: d.id, label: d.label })),
		{ id: 'window', label: 'In a window' },
		{ id: 'off', label: 'Off' },
	]
}

export type ActionsSchema = {
	output_screen: { options: { output: ScreenOutputId; screen: string } }
	show: { options: { mode: 'start' | 'stop' | 'toggle' } }
	slide_next: { options: Record<string, never> }
	slide_prev: { options: Record<string, never> }
	slide_goto: { options: { slide: number } }
	presentation_step: { options: { direction: 'up' | 'down' } }
	presentation_cue: { options: { number: number } }
	presentation_take: { options: Record<string, never> }
	timer: { options: { mode: 'start' | 'stop' | 'toggle' | 'reset' } }
	timer_add: { options: { seconds: number } }
	output: { options: { output: OutputId; state: 'on' | 'off' | 'toggle' } }
	video: { options: { mode: 'play' | 'pause' | 'toggle' | 'restart' } }
	scroll: { options: { mode: 'play' | 'pause' | 'toggle' | 'restart' } }
	scroll_speed: { options: { mode: 'faster' | 'slower' | 'normal' } }
	scroll_speed_set: { options: { percent: number } }
	refresh: { options: Record<string, never> }
}

const whole = (n: unknown, fallback: number): number => {
	const v = Math.floor(Number(n))
	return Number.isFinite(v) ? v : fallback
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		show: {
			name: 'Slide show: start / stop',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Do',
					default: 'toggle',
					choices: [
						{ id: 'start', label: 'Start' },
						{ id: 'stop', label: 'Stop' },
						{ id: 'toggle', label: 'Start or stop (toggle)' },
					],
				},
			],
			callback: (action) => self.send(`/show/${action.options.mode}`),
		},
		slide_next: {
			name: 'Slide: next',
			description: 'Next build or slide (starts the show if it is not running)',
			options: [],
			callback: () => self.send('/slide/next'),
		},
		slide_prev: {
			name: 'Slide: previous',
			description: 'Previous build or slide',
			options: [],
			callback: () => self.send('/slide/prev'),
		},
		slide_goto: {
			name: 'Slide: go to',
			options: [{ id: 'slide', type: 'number', label: 'Slide', default: 1, min: 1, max: 9999, asInteger: true }],
			callback: (action) => self.send('/slide/goto', [Math.max(1, whole(action.options.slide, 1))]),
		},
		presentation_step: {
			name: 'Presentation: cue above / below',
			description: 'Cue the presentation above or below in the list (take it to switch)',
			options: [
				{
					id: 'direction',
					type: 'dropdown',
					label: 'Direction',
					default: 'down',
					choices: [
						{ id: 'up', label: 'Up (previous)' },
						{ id: 'down', label: 'Down (next)' },
					],
				},
			],
			callback: (action) => self.send(`/presentation/${action.options.direction}`),
		},
		presentation_cue: {
			name: 'Presentation: cue number',
			description: 'Cue a presentation by its place in the list (take it to switch)',
			options: [
				{ id: 'number', type: 'number', label: 'Number in the list', default: 1, min: 1, max: 999, asInteger: true },
			],
			callback: (action) => self.send('/presentation/cue', [Math.max(1, whole(action.options.number, 1))]),
		},
		presentation_take: {
			name: 'Presentation: take cued',
			description: 'Switch to the cued presentation',
			options: [],
			callback: () => self.send('/presentation/take'),
		},
		timer: {
			name: 'Timer: start / stop / reset',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Do',
					default: 'toggle',
					choices: [
						{ id: 'start', label: 'Start' },
						{ id: 'stop', label: 'Stop' },
						{ id: 'toggle', label: 'Start or stop (toggle)' },
						{ id: 'reset', label: 'Reset to zero' },
					],
				},
			],
			callback: (action) => self.send(`/timer/${action.options.mode}`),
		},
		timer_add: {
			name: 'Timer: add or take away time',
			description:
				"Changes the loaded presentation's speaker time if it has one, otherwise the elapsed time. Negative takes time away.",
			options: [{ id: 'seconds', type: 'number', label: 'Seconds', default: 30, min: -3600, max: 3600, step: 10 }],
			callback: (action) => {
				const s = Number(action.options.seconds)
				if (Number.isFinite(s) && s !== 0) self.send('/timer/add', [s])
			},
		},
		output: {
			name: 'Output: on / off',
			options: [
				{ id: 'output', type: 'dropdown', label: 'Output', default: 'program', choices: OUTPUT_CHOICES },
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'toggle',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Switch (toggle)' },
					],
				},
			],
			callback: (action) => {
				const { output, state } = action.options
				if (state === 'toggle') self.send(`/output/${output}/toggle`)
				else self.send(`/output/${output}`, [state === 'on' ? 1 : 0])
			},
		},
		output_screen: {
			name: 'Output: show on screen',
			description:
				'Show the program or speaker notes on a screen of the PPTPresent computer. The list fills in once PPTPresent is connected; type a number to pick that screen of the list instead.',
			options: [
				{ id: 'output', type: 'dropdown', label: 'Output', default: 'program', choices: SCREEN_OUTPUT_CHOICES },
				{
					id: 'screen',
					type: 'dropdown',
					label: 'Screen',
					default: self.displays[0]?.id ?? 'window',
					choices: screenChoices(self),
					allowCustom: true,
				},
			],
			callback: (action) => {
				const screen = String(action.options.screen ?? '').trim()
				if (screen) self.send(`/output/${action.options.output}/screen`, [screen])
			},
		},
		video: {
			name: 'Video: play / pause / restart',
			description:
				'The loaded video clip (PPTPresent 0.1.17 or later). Play starts the show if it is not running; restart goes back to the beginning.',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Do',
					default: 'toggle',
					choices: [
						{ id: 'play', label: 'Play' },
						{ id: 'pause', label: 'Pause' },
						{ id: 'toggle', label: 'Play or pause (toggle)' },
						{ id: 'restart', label: 'Back to the start' },
					],
				},
			],
			callback: (action) => self.send(`/video/${action.options.mode}`),
		},
		scroll: {
			name: 'Scrolling text: pause / carry on / start again',
			description:
				'Scrolling text (lyrics, a ticker) on the slide on screen (PPTPresent 0.1.23 or later). Start again scrolls it from the beginning.',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Do',
					default: 'toggle',
					choices: [
						{ id: 'play', label: 'Carry on' },
						{ id: 'pause', label: 'Pause' },
						{ id: 'toggle', label: 'Pause or carry on (toggle)' },
						{ id: 'restart', label: 'Start again from the beginning' },
					],
				},
			],
			callback: (action) => self.send(`/scroll/${action.options.mode}`),
		},
		scroll_speed: {
			name: 'Scrolling text: faster / slower',
			description:
				'Faster and slower change the speed by 10 % of the speed set in the designer (from 20 % to 300 %). Each new slide starts at its own speed.',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Do',
					default: 'faster',
					choices: [
						{ id: 'faster', label: 'Faster (+10 %)' },
						{ id: 'slower', label: 'Slower (−10 %)' },
						{ id: 'normal', label: 'As designed (100 %)' },
					],
				},
			],
			callback: (action) => self.send(`/scroll/${action.options.mode}`),
		},
		scroll_speed_set: {
			name: 'Scrolling text: set speed',
			description: 'The speed in percent of the speed set in the designer: 100 is as designed, 50 half as fast',
			options: [{ id: 'percent', type: 'number', label: 'Percent', default: 100, min: 20, max: 300, step: 5 }],
			callback: (action) => {
				const p = Number(action.options.percent)
				if (Number.isFinite(p) && p > 0) self.send('/scroll/speed', [Math.round(Math.min(300, Math.max(20, p)))])
			},
		},
		refresh: {
			name: 'Refresh feedback',
			description: 'Ask PPTPresent to send all feedback values now',
			options: [],
			callback: () => self.send('/feedback'),
		},
	})
}
