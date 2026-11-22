import {
	clampPageNumber,
	clampPageSize,
	createQueryRequest,
	normalizeRows
} from 'c/datatablePlusUtils'

describe('normalizeRows', () => {
	it('returns the supplied array unchanged', () => {
		const rows = [{Id: '001000000000001'}]

		expect(normalizeRows(rows)).toBe(rows)
	})

	it.each([null, undefined, '', 0, false, {}])('returns an empty array for %p', value => {
		expect(normalizeRows(value)).toEqual([])
	})
})

describe('clampPageSize', () => {
	it('uses the default for non-finite values', () => {
		expect(clampPageSize(null)).toBe(20)
		expect(clampPageSize('20')).toBe(20)
		expect(clampPageSize(NaN)).toBe(20)
	})

	it('clamps numeric values to the documented range', () => {
		expect(clampPageSize(-5)).toBe(1)
		expect(clampPageSize(0)).toBe(1)
		expect(clampPageSize(1)).toBe(1)
		expect(clampPageSize(200)).toBe(200)
		expect(clampPageSize(201)).toBe(200)
	})

	it('truncates fractional page sizes', () => {
		expect(clampPageSize(20.9)).toBe(20)
	})
})

describe('clampPageNumber', () => {
	it('uses one for non-finite values', () => {
		expect(clampPageNumber(null)).toBe(1)
		expect(clampPageNumber('2')).toBe(1)
		expect(clampPageNumber(NaN)).toBe(1)
	})

	it('clamps to at least one and truncates fractions', () => {
		expect(clampPageNumber(-3)).toBe(1)
		expect(clampPageNumber(0)).toBe(1)
		expect(clampPageNumber(1)).toBe(1)
		expect(clampPageNumber(2.9)).toBe(2)
	})
})

describe('createQueryRequest', () => {
	it('creates the documented request from valid state', () => {
		const state = {
			objectApiName: 'Account',
			fields: ['Id', 'Name', 'Industry'],
			searchFields: ['Name'],
			searchTerm: 'acme',
			sortBy: 'Name',
			sortDirection: 'DESC',
			pageNumber: 3,
			pageSize: 50
		}

		expect(createQueryRequest(state)).toEqual({
			objectApiName: 'Account',
			fields: ['Id', 'Name', 'Industry'],
			searchFields: ['Name'],
			searchTerm: 'acme',
			sortBy: 'Name',
			sortDirection: 'DESC',
			pageNumber: 3,
			pageSize: 50
		})
	})

	it('uses defaults for missing, null, and invalid state', () => {
		const expectedRequest = {
			objectApiName: '',
			fields: [],
			searchFields: [],
			searchTerm: '',
			sortBy: null,
			sortDirection: null,
			pageNumber: 1,
			pageSize: 20
		}

		expect(createQueryRequest()).toEqual(expectedRequest)
		expect(createQueryRequest(null)).toEqual(expectedRequest)
	})

	it('copies field arrays instead of retaining caller references', () => {
		const fields = ['Id']
		const searchFields = ['Name']
		const request = createQueryRequest({fields, searchFields})

		expect(request.fields).not.toBe(fields)
		expect(request.searchFields).not.toBe(searchFields)
	})

	it('normalizes documented sort directions and rejects others', () => {
		expect(createQueryRequest({sortDirection: 'asc'}).sortDirection).toBe('ASC')
		expect(createQueryRequest({sortDirection: 'desc'}).sortDirection).toBe('DESC')
		expect(createQueryRequest({sortDirection: 'sideways'}).sortDirection).toBeNull()
	})
})
