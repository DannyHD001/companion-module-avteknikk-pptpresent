import { combineRgb } from '@companion-module/base'
import { OUTPUT_CHOICES, SCREEN_OUTPUT_CHOICES, screenChoices, type OutputId, type ScreenOutputId } from './actions.js'
import { secondsLeft, type TimerState } from './variables.js'
import type ModuleInstance from './main.js'

export const COLORS = {
	white: combineRgb(255, 255, 255),
	black: combineRgb(0, 0, 0),
	grey: combineRgb(51, 51, 51),
	green: combineRgb(0, 153, 51),
	red: combineRgb(204, 0, 0),
	amber: combineRgb(230, 140, 0),
	yellow: combineRgb(255, 204, 0),
	blue: combineRgb(0, 80, 160),
}

export type FeedbacksSchema = {
	connected: { type: 'boolean'; options: Record<string, never> }
	show_running: { type: 'boolean'; options: Record<string, never> }
	slide_is: { type: 'boolean'; options: { slide: number } }
	presentation_loaded: { type: 'boolean'; options: { number: number } }
	presentation_cued: { type: 'boolean'; options: { number: number } }
	timer_running: { type: 'boolean'; options: Record<string, never> }
	timer_state: { type: 'boolean'; options: { state: TimerState } }
	video_loaded: { type: 'boolean'; options: Record<string, never> }
	video_playing: { type: 'boolean'; options: Record<string, never> }
	video_ending: { type: 'boolean'; options: { seconds: number } }
	scroll_active: { type: 'boolean'; options: Record<string, never> }
	scroll_paused: { type: 'boolean'; options: Record<string, never> }
	scroll_speed_changed: { type: 'boolean'; options: Record<string, never> }
	output_on: { type: 'boolean'; options: { output: OutputId } }
	output_screen: { type: 'boolean'; options: { output: ScreenOutputId; screen: string } }
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	const s = self.state
	self.setFeedbackDefinitions({
		connected: {
			type: 'boolean',
			name: 'Connected to PPTPresent',
			description: 'True while PPTPresent answers',
			defaultStyle: { bgcolor: COLORS.green, color: COLORS.white },
			options: [],
			callback: () => s.connected,
		},
		show_running: {
			type: 'boolean',
			name: 'Slide show running',
			defaultStyle: { bgcolor: COLORS.green, color: COLORS.white },
			options: [],
			callback: () => s.show_running,
		},
		slide_is: {
			type: 'boolean',
			name: 'Slide show is on slide',
			defaultStyle: { bgcolor: COLORS.green, color: COLORS.white },
			options: [{ id: 'slide', type: 'number', label: 'Slide', default: 1, min: 1, max: 9999, asInteger: true }],
			callback: (fb) => s.show_running && s.slide_index === Number(fb.options.slide),
		},
		presentation_loaded: {
			type: 'boolean',
			name: 'Presentation is loaded',
			description: 'The presentation at this place in the list is the loaded one',
			defaultStyle: { bgcolor: COLORS.green, color: COLORS.white },
			options: [
				{ id: 'number', type: 'number', label: 'Number in the list', default: 1, min: 1, max: 999, asInteger: true },
			],
			callback: (fb) => s.presentation_number > 0 && s.presentation_number === Number(fb.options.number),
		},
		presentation_cued: {
			type: 'boolean',
			name: 'Presentation is cued',
			description: 'A presentation is cued; with a number, that one is',
			defaultStyle: { bgcolor: COLORS.amber, color: COLORS.black },
			options: [
				{
					id: 'number',
					type: 'number',
					label: 'Number in the list (0 = any)',
					default: 0,
					min: 0,
					max: 999,
					asInteger: true,
				},
			],
			callback: (fb) => {
				const n = Number(fb.options.number)
				return s.presentation_cued_number > 0 && (n === 0 || s.presentation_cued_number === n)
			},
		},
		timer_running: {
			type: 'boolean',
			name: 'Timer running',
			defaultStyle: { bgcolor: COLORS.green, color: COLORS.white },
			options: [],
			callback: () => s.timer_running,
		},
		timer_state: {
			type: 'boolean',
			name: 'Timer state',
			description: 'Warn is shortly before the speaker time ends, over is after it',
			defaultStyle: { bgcolor: COLORS.red, color: COLORS.white },
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'over',
					choices: [
						{ id: 'normal', label: 'Normal' },
						{ id: 'warn', label: 'Near the end (warn)' },
						{ id: 'over', label: 'Over time' },
					],
				},
			],
			callback: (fb) => s.timer_state === fb.options.state,
		},
		video_loaded: {
			type: 'boolean',
			name: 'Video clip loaded',
			description: 'The loaded presentation is a video clip',
			defaultStyle: { bgcolor: COLORS.blue, color: COLORS.white },
			options: [],
			callback: () => s.video_loaded,
		},
		video_playing: {
			type: 'boolean',
			name: 'Video is playing',
			defaultStyle: { bgcolor: COLORS.green, color: COLORS.white },
			options: [],
			callback: () => s.video_loaded && s.video_playing,
		},
		video_ending: {
			type: 'boolean',
			name: 'Video time left below',
			description: 'The playing video clip has less than this much time left',
			defaultStyle: { bgcolor: COLORS.red, color: COLORS.white },
			options: [{ id: 'seconds', type: 'number', label: 'Seconds', default: 10, min: 1, max: 3600, asInteger: true }],
			callback: (fb) => {
				const left = secondsLeft(s.video_remaining)
				return s.video_loaded && s.video_playing && left !== null && left < Number(fb.options.seconds)
			},
		},
		scroll_active: {
			type: 'boolean',
			name: 'Scrolling text on screen',
			description: 'The slide on screen has scrolling text',
			defaultStyle: { bgcolor: COLORS.blue, color: COLORS.white },
			options: [],
			callback: () => s.scroll_active,
		},
		scroll_paused: {
			type: 'boolean',
			name: 'Scrolling text paused',
			defaultStyle: { bgcolor: COLORS.amber, color: COLORS.black },
			options: [],
			callback: () => s.scroll_active && s.scroll_paused,
		},
		scroll_speed_changed: {
			type: 'boolean',
			name: 'Scrolling text faster or slower than designed',
			description: 'The speed is not 100 %',
			defaultStyle: { bgcolor: COLORS.amber, color: COLORS.black },
			options: [],
			callback: () => s.scroll_active && s.scroll_speed !== 100,
		},
		output_on: {
			type: 'boolean',
			name: 'Output is on',
			defaultStyle: { bgcolor: COLORS.green, color: COLORS.white },
			options: [{ id: 'output', type: 'dropdown', label: 'Output', default: 'program', choices: OUTPUT_CHOICES }],
			callback: (fb) => s[`output_${fb.options.output}`] === true,
		},
		output_screen: {
			type: 'boolean',
			name: 'Output is on screen',
			description: 'The program or speaker notes are shown on this screen (or in a window, or off)',
			defaultStyle: { bgcolor: COLORS.green, color: COLORS.white },
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
			callback: (fb) => {
				const want = String(fb.options.screen ?? '')
					.trim()
					.toLowerCase()
				const id = fb.options.output === 'speaker' ? s.output_speaker_screen_id : s.output_program_screen_id
				const number = fb.options.output === 'speaker' ? s.output_speaker_screen : s.output_program_screen
				if (want === id.toLowerCase()) return true
				// A number typed in means that screen of the list.
				return number > 0 && want === String(number) && !self.displays.some((d) => d.id === want)
			},
		},
	})
}
