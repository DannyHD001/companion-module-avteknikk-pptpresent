// Minimal OSC 1.0 encoding and decoding: enough to talk to PPTPresent.

export type OscValue = number | string | boolean | null

export interface OscMessage {
	address: string
	args: OscValue[]
}

const pad4 = (n: number): number => (n + 3) & ~3

function stringBytes(s: string): Buffer {
	const raw = Buffer.from(s, 'utf8')
	const out = Buffer.alloc(pad4(raw.length + 1))
	raw.copy(out)
	return out
}

/** Whole numbers are sent as int32, others as float32. */
export function encodeMessage(address: string, args: (number | string)[] = []): Buffer {
	let tags = ','
	const parts: Buffer[] = []
	for (const a of args) {
		if (typeof a === 'string') {
			tags += 's'
			parts.push(stringBytes(a))
		} else if (Number.isInteger(a) && Math.abs(a) <= 0x7fffffff) {
			tags += 'i'
			const b = Buffer.alloc(4)
			b.writeInt32BE(a)
			parts.push(b)
		} else {
			tags += 'f'
			const b = Buffer.alloc(4)
			b.writeFloatBE(a)
			parts.push(b)
		}
	}
	return Buffer.concat([stringBytes(address), stringBytes(tags), ...parts])
}

function readString(buf: Buffer, offset: number): [string, number] {
	let end = offset
	while (end < buf.length && buf[end] !== 0) end++
	if (end >= buf.length) throw new Error('OSC string not terminated')
	return [buf.toString('utf8', offset, end), pad4(end + 1)]
}

function decodeMessage(buf: Buffer): OscMessage {
	const [address, afterAddress] = readString(buf, 0)
	if (!address.startsWith('/')) throw new Error('OSC address must start with /')
	if (afterAddress >= buf.length) return { address, args: [] }
	const [tags, afterTags] = readString(buf, afterAddress)
	if (!tags.startsWith(',')) return { address, args: [] }
	let offset = afterTags
	const args: OscValue[] = []
	const need = (n: number): void => {
		if (offset + n > buf.length) throw new Error('OSC message too short')
	}
	for (const tag of tags.slice(1)) {
		switch (tag) {
			case 'i':
				need(4)
				args.push(buf.readInt32BE(offset))
				offset += 4
				break
			case 'f':
				need(4)
				args.push(buf.readFloatBE(offset))
				offset += 4
				break
			case 'd':
				need(8)
				args.push(buf.readDoubleBE(offset))
				offset += 8
				break
			case 'h':
				need(8)
				args.push(Number(buf.readBigInt64BE(offset)))
				offset += 8
				break
			case 's':
			case 'S': {
				const [s, next] = readString(buf, offset)
				args.push(s)
				offset = next
				break
			}
			case 'b': {
				need(4)
				const size = buf.readInt32BE(offset)
				offset = pad4(offset + 4 + size)
				args.push(null)
				break
			}
			case 'T':
				args.push(true)
				break
			case 'F':
				args.push(false)
				break
			case 'N':
			case 'I':
				args.push(null)
				break
			case 't':
				need(8)
				offset += 8
				break
			default:
				// Unknown type: its size is unknown, so the rest cannot be read.
				return { address, args }
		}
	}
	return { address, args }
}

/** Decodes a UDP packet: one message, or a bundle (possibly nested) of messages. */
export function decodePacket(buf: Buffer): OscMessage[] {
	if (buf.length >= 16 && buf.toString('ascii', 0, 8) === '#bundle\0') {
		const out: OscMessage[] = []
		let offset = 16
		while (offset + 4 <= buf.length) {
			const size = buf.readInt32BE(offset)
			offset += 4
			if (size <= 0 || offset + size > buf.length) break
			out.push(...decodePacket(buf.subarray(offset, offset + size)))
			offset += size
		}
		return out
	}
	return [decodeMessage(buf)]
}
