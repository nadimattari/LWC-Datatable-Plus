import {normalizeRows} from 'c/datatablePlusUtils'

describe('normalizeRows', () => {
	it('returns the supplied array unchanged', () => {
		const rows = [{Id: '001000000000001'}]

		expect(normalizeRows(rows)).toBe(rows)
	})

	it.each([null, undefined, '', 0, false, {}])('returns an empty array for %p', value => {
		expect(normalizeRows(value)).toEqual([])
	})
})
