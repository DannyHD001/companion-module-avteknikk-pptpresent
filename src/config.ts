import type { SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
	feedbackPort: number
}

export const DEFAULT_CONFIG: ModuleConfig = {
	host: '127.0.0.1',
	port: 8000,
	feedbackPort: 9000,
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Setup',
			width: 12,
			value:
				'In PPTPresent open App settings › Remote control (OSC) and turn it on. ' +
				'Use the same command port below, and leave its feedback host empty (or set it to this computer) so feedback comes back here.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'PPTPresent computer',
			description: 'IP address or name of the computer running PPTPresent (127.0.0.1 when it runs here)',
			width: 6,
			default: DEFAULT_CONFIG.host,
			minLength: 1,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Command port',
			description: 'The OSC port PPTPresent listens on (8000 by default)',
			width: 3,
			min: 1,
			max: 65535,
			default: DEFAULT_CONFIG.port,
			asInteger: true,
		},
		{
			type: 'number',
			id: 'feedbackPort',
			label: 'Feedback port',
			description: 'The port PPTPresent sends feedback to (9000 by default)',
			width: 3,
			min: 1,
			max: 65535,
			default: DEFAULT_CONFIG.feedbackPort,
			asInteger: true,
		},
	]
}
