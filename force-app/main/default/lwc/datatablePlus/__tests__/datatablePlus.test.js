import {createElement} from 'lwc'
import queryRecords from '@salesforce/apex/DatatablePlusQueryService.query'
import DatatablePlus from 'c/datatablePlus'

jest.mock(
	'@salesforce/apex/DatatablePlusQueryService.query',
	() => ({
		default: jest.fn()
	}),
	{virtual: true}
)

const flushPromises = async () => {
	await Promise.resolve()
	await Promise.resolve()
}

const columns = [
	{fieldName: 'Name', label: 'Name', type: 'text'},
	{fieldName: 'Industry', label: 'Industry', type: 'text'}
]

function successResponse(overrides = {}) {
	return {
		ok: true,
		rows: [{Id: '001000000000001AAA', Name: 'Acme'}],
		totalItemCount: 1,
		pageNumber: 1,
		pageSize: 20,
		error: null,
		...overrides
	}
}

function failureResponse(error) {
	return {
		ok: false,
		rows: [],
		totalItemCount: 0,
		pageNumber: 1,
		pageSize: 20,
		error
	}
}

describe('c-datatable-plus shell', () => {
	let element

	beforeEach(() => {
		queryRecords.mockReset()
		queryRecords.mockResolvedValue(successResponse())
	})

	afterEach(() => {
		while (document.body.firstChild) {
			document.body.removeChild(document.body.firstChild)
		}
	})

	function render(props = {}) {
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		Object.assign(element, props)
		document.body.appendChild(element)
		return element
	}

	function table() {
		return element.shadowRoot.querySelector('lightning-datatable')
	}

	function controls() {
		return element.shadowRoot.querySelector('c-query-controls')
	}

	it('uses the documented public defaults', async () => {
		render()

		expect(element.objectApiName).toBe('')
		expect(element.columns).toEqual([])
		expect(element.keyField).toBe('Id')
		expect(element.pageSize).toBe(20)
		expect(element.searchFields).toEqual([])
		expect(element.title).toBe('')

		await flushPromises()
	})

	it('clamps a finite page size to the supported range', async () => {
		render({pageSize: 500})

		expect(element.pageSize).toBe(200)

		await flushPromises()
	})

	it('uses the default page size for a non-numeric value', async () => {
		render({pageSize: Number.NaN})

		expect(element.pageSize).toBe(20)

		await flushPromises()
	})

	it('sends the exact initial query request to the Apex boundary', async () => {
		render({
			objectApiName: 'Account',
			columns,
			keyField: 'Id',
			searchFields: ['Name'],
			pageSize: 10
		})

		await flushPromises()

		expect(queryRecords).toHaveBeenCalledTimes(1)
		expect(queryRecords).toHaveBeenCalledWith({
			objectApiName: 'Account',
			fields: ['Id', 'Name', 'Industry'],
			searchFields: ['Name'],
			searchTerm: '',
			sortBy: null,
			sortDirection: null,
			pageNumber: 1,
			pageSize: 10
		})
	})

	it('uses a custom key field and de-duplicates column fields', async () => {
		render({
			objectApiName: 'Contact',
			columns: [
				{fieldName: 'Id', label: 'Id'},
				{fieldName: 'Name', label: 'Name'},
				{label: 'Ignored'},
				{fieldName: '', label: 'Blank'}
			],
			keyField: 'Id'
		})

		await flushPromises()

		expect(queryRecords.mock.calls[0][0].fields).toEqual(['Id', 'Name'])
	})

	it('requests only the key field when columns are not an array', async () => {
		render({objectApiName: 'Account', columns: null})

		await flushPromises()

		expect(queryRecords.mock.calls[0][0].fields).toEqual(['Id'])
		expect(table().columns).toEqual([])
	})

	it('renders rows, columns, key field, and the accessible table label', async () => {
		const rows = [{Id: '001000000000001AAA', Name: 'Acme'}]
		queryRecords.mockResolvedValueOnce(successResponse({rows, totalItemCount: 1}))
		render({objectApiName: 'Account', columns, title: 'Account list'})

		await flushPromises()

		expect(table().data).toEqual(rows)
		expect(table().columns).toEqual(columns)
		expect(table().keyField).toBe('Id')
		expect(table().getAttribute('aria-label')).toBe('Account list')
	})

	it('renders the optional heading above the table', async () => {
		render({objectApiName: 'Account', columns, title: 'Account list'})

		await flushPromises()

		const heading = element.shadowRoot.querySelector('[data-id="title"]')

		expect(heading.tagName).toBe('H2')
		expect(heading.textContent).toBe('Account list')
	})

	it('falls back to the object name when no title is supplied', async () => {
		render({objectApiName: 'Account', columns})

		await flushPromises()

		expect(element.shadowRoot.querySelector('[data-id="title"]')).toBeNull()
		expect(table().getAttribute('aria-label')).toBe('Account')
	})

	it('falls back to a generic label when neither title nor object is supplied', async () => {
		render({columns})

		await flushPromises()

		expect(table().getAttribute('aria-label')).toBe('Records')
	})

	it('announces loading through a persistent status region', async () => {
		let resolveQuery
		queryRecords.mockImplementationOnce(
			() =>
				new Promise(resolve => {
					resolveQuery = resolve
				})
		)
		render({objectApiName: 'Account', columns})

		const status = element.shadowRoot.querySelector('[data-id="statusMessage"]')

		expect(status.getAttribute('role')).toBe('status')
		expect(status.getAttribute('aria-live')).toBe('polite')
		expect(status.textContent.trim()).toBe('Loading records')
		expect(element.shadowRoot.querySelector('[data-id="emptyMessage"]')).toBeNull()

		resolveQuery(successResponse())
		await flushPromises()

		expect(table().isLoading).toBe(false)
		expect(status.textContent.trim()).toBe('Records loaded')
		expect(element.shadowRoot.querySelector('[data-id="emptyMessage"]')).toBeNull()
	})

	it('emits datachange with the documented payload and event flags', async () => {
		const handler = jest.fn()
		const rows = [{Id: '001000000000001AAA', Name: 'Acme'}]
		queryRecords.mockResolvedValueOnce(
			successResponse({rows, totalItemCount: 7, pageNumber: 2, pageSize: 10})
		)
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('datachange', handler)
		Object.assign(element, {objectApiName: 'Account', columns, pageSize: 10})
		document.body.appendChild(element)

		await flushPromises()

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0][0].detail).toEqual({
			rows,
			totalItemCount: 7,
			pageNumber: 2,
			pageSize: 10
		})
		expect(handler.mock.calls[0][0].bubbles).toBe(true)
		expect(handler.mock.calls[0][0].composed).toBe(true)
	})

	it('shows an empty status when a successful query returns no rows', async () => {
		queryRecords.mockResolvedValueOnce(successResponse({rows: [], totalItemCount: 0}))
		render({objectApiName: 'Account', columns})

		await flushPromises()

		const message = element.shadowRoot.querySelector('[data-id="emptyMessage"]')
		const status = element.shadowRoot.querySelector('[data-id="statusMessage"]')

		expect(message.hasAttribute('role')).toBe(false)
		expect(message.textContent).toBe('No records to display.')
		expect(status.textContent.trim()).toBe('No records to display.')
	})

	it('shows an inline alert and emits error for a structured failure', async () => {
		const handler = jest.fn()
		queryRecords.mockResolvedValueOnce(
			failureResponse({errorCode: 'INVALID_FIELD', message: 'Field is unavailable.'})
		)
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('error', handler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()

		const alert = element.shadowRoot.querySelector('[data-id="errorMessage"]')

		expect(alert.getAttribute('role')).toBe('alert')
		expect(alert.textContent).toContain('Field is unavailable.')
		expect(element.shadowRoot.querySelector('[data-id="emptyMessage"]')).toBeNull()
		expect(
			element.shadowRoot.querySelector('[data-id="statusMessage"]').textContent.trim()
		).toBe('')
		expect(table().data).toEqual([])
		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0][0].detail).toEqual({
			errorCode: 'INVALID_FIELD',
			message: 'Field is unavailable.'
		})
		expect(handler.mock.calls[0][0].bubbles).toBe(true)
		expect(handler.mock.calls[0][0].composed).toBe(true)
	})

	it('converts a rejected Apex promise into the documented generic error', async () => {
		const handler = jest.fn()
		queryRecords.mockRejectedValueOnce(new Error('database details'))
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('error', handler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()

		const alert = element.shadowRoot.querySelector('[data-id="errorMessage"]')

		expect(alert.textContent).not.toContain('database details')
		expect(handler.mock.calls[0][0].detail).toEqual({
			errorCode: 'QUERY_FAILED',
			message: 'The query could not be completed.'
		})
	})

	it('uses a generic error when a failure response has no structured error', async () => {
		const handler = jest.fn()
		queryRecords.mockResolvedValueOnce({ok: false, rows: null})
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('error', handler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()

		expect(handler.mock.calls[0][0].detail).toEqual({
			errorCode: 'QUERY_FAILED',
			message: 'The query could not be completed.'
		})
	})

	it('uses a generic error when the Apex boundary returns no response', async () => {
		const handler = jest.fn()
		queryRecords.mockResolvedValueOnce(null)
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('error', handler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()

		expect(handler.mock.calls[0][0].detail).toEqual({
			errorCode: 'QUERY_FAILED',
			message: 'The query could not be completed.'
		})
	})

	it('uses safe values when string properties have the wrong type', async () => {
		render({objectApiName: null, columns: null, keyField: null, title: 42})

		await flushPromises()

		expect(table().getAttribute('aria-label')).toBe('Records')
		expect(queryRecords.mock.calls[0][0].objectApiName).toBe('')
		expect(queryRecords.mock.calls[0][0].fields).toEqual([])
	})

	it('normalizes malformed success envelopes without throwing', async () => {
		const handler = jest.fn()
		queryRecords.mockResolvedValueOnce({
			ok: true,
			rows: 'invalid',
			totalItemCount: 'invalid',
			pageNumber: 0,
			pageSize: 999
		})
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('datachange', handler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()

		expect(handler.mock.calls[0][0].detail).toEqual({
			rows: [],
			totalItemCount: 0,
			pageNumber: 1,
			pageSize: 200
		})
	})

	it('passes active query state to the internal controls', async () => {
		queryRecords.mockResolvedValueOnce(
			successResponse({rows: [], totalItemCount: 42, pageNumber: 3, pageSize: 10})
		)
		render({objectApiName: 'Account', columns, searchFields: ['Name'], pageSize: 10})

		await flushPromises()

		expect(controls()).not.toBeNull()
		expect(controls().pageNumber).toBe(3)
		expect(controls().pageSize).toBe(10)
		expect(controls().totalItemCount).toBe(42)
		expect(controls().searchTerm).toBe('')
		expect(controls().searchEnabled).toBe(true)
	})

	it('runs a trimmed search request from the first page', async () => {
		queryRecords.mockResolvedValueOnce(successResponse({pageNumber: 3}))
		render({objectApiName: 'Account', columns, searchFields: ['Name']})

		await flushPromises()

		controls().dispatchEvent(
			new CustomEvent('pagerequest', {detail: {pageNumber: 3}, bubbles: true})
		)
		await flushPromises()
		expect(queryRecords.mock.calls[1][0].pageNumber).toBe(3)

		controls().dispatchEvent(
			new CustomEvent('searchrequest', {detail: {searchTerm: '  acme  '}, bubbles: true})
		)
		await flushPromises()

		const request = queryRecords.mock.calls[2][0]

		expect(request.searchTerm).toBe('acme')
		expect(request.pageNumber).toBe(1)
	})

	it('clears search text when a search request has no string value', async () => {
		render({objectApiName: 'Account', columns, searchFields: ['Name']})

		await flushPromises()

		controls().dispatchEvent(
			new CustomEvent('searchrequest', {detail: {searchTerm: null}, bubbles: true})
		)
		await flushPromises()

		expect(queryRecords.mock.calls[1][0].searchTerm).toBe('')
	})

	it('runs a page request from the internal controls', async () => {
		queryRecords
			.mockResolvedValueOnce(successResponse({pageNumber: 3, totalItemCount: 61}))
			.mockResolvedValueOnce(successResponse({pageNumber: 3, totalItemCount: 61}))
		render({objectApiName: 'Account', columns, pageSize: 20})

		await flushPromises()

		controls().dispatchEvent(
			new CustomEvent('pagerequest', {detail: {pageNumber: 3}, bubbles: true})
		)
		await flushPromises()

		expect(queryRecords.mock.calls[1][0].pageNumber).toBe(3)
		expect(controls().pageNumber).toBe(3)
		expect(controls().totalItemCount).toBe(61)
	})

	it('maps datatable sort events to uppercase Apex sort state and resets the page', async () => {
		queryRecords
			.mockResolvedValueOnce(successResponse({pageNumber: 2}))
			.mockResolvedValueOnce(successResponse({pageNumber: 2}))
		render({objectApiName: 'Account', columns})

		await flushPromises()

		controls().dispatchEvent(
			new CustomEvent('pagerequest', {detail: {pageNumber: 2}, bubbles: true})
		)
		await flushPromises()

		table().dispatchEvent(
			new CustomEvent('sort', {detail: {fieldName: 'Name', sortDirection: 'desc'}})
		)
		await flushPromises()

		const request = queryRecords.mock.calls[2][0]

		expect(request.sortBy).toBe('Name')
		expect(request.sortDirection).toBe('DESC')
		expect(request.pageNumber).toBe(1)
	})

	it('clears an active sort when the datatable reports no direction', async () => {
		const errorHandler = jest.fn()
		queryRecords
			.mockResolvedValueOnce(successResponse({pageNumber: 2}))
			.mockResolvedValueOnce(successResponse({pageNumber: 2}))
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('error', errorHandler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()

		controls().dispatchEvent(
			new CustomEvent('pagerequest', {detail: {pageNumber: 2}, bubbles: true})
		)
		await flushPromises()

		table().dispatchEvent(
			new CustomEvent('sort', {detail: {fieldName: 'Name', sortDirection: 'desc'}})
		)
		await flushPromises()

		table().dispatchEvent(
			new CustomEvent('sort', {detail: {fieldName: 'Name', sortDirection: null}})
		)
		await flushPromises()

		const request = queryRecords.mock.calls[queryRecords.mock.calls.length - 1][0]

		expect(request.sortBy).toBeNull()
		expect(request.sortDirection).toBeNull()
		expect(request.pageNumber).toBe(1)
		expect(errorHandler).not.toHaveBeenCalled()
	})

	it('ignores a sort event without a field name', async () => {
		render({objectApiName: 'Account', columns})

		await flushPromises()

		table().dispatchEvent(
			new CustomEvent('sort', {detail: {fieldName: '', sortDirection: 'asc'}})
		)
		await flushPromises()

		expect(queryRecords).toHaveBeenCalledTimes(1)
	})

	it('emits selectionchange with current rows and key values', async () => {
		const handler = jest.fn()
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('selectionchange', handler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()
		handler.mockClear()

		const selectedRows = [
			{Id: '001000000000001AAA', Name: 'Acme'},
			{Id: '001000000000002AAA', Name: 'Beta'}
		]
		table().dispatchEvent(new CustomEvent('rowselection', {detail: {selectedRows}}))
		await flushPromises()

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0][0].detail).toEqual({
			selectedRows,
			selectedRowKeys: ['001000000000001AAA', '001000000000002AAA']
		})
		expect(handler.mock.calls[0][0].bubbles).toBe(true)
		expect(handler.mock.calls[0][0].composed).toBe(true)
		expect(table().selectedRows).toEqual(['001000000000001AAA', '001000000000002AAA'])
	})

	it('skips malformed selection details and rows without a key', async () => {
		render({objectApiName: 'Account', columns})

		await flushPromises()

		table().dispatchEvent(new CustomEvent('rowselection', {detail: null}))
		expect(table().selectedRows).toEqual([])

		table().dispatchEvent(new CustomEvent('rowselection', {detail: {}}))
		expect(table().selectedRows).toEqual([])

		table().dispatchEvent(
			new CustomEvent('rowselection', {
				detail: {selectedRows: [null, {Name: 'No key'}, {Id: null}]}
			})
		)
		expect(table().selectedRows).toEqual([])
	})

	it('handles malformed interaction event details without throwing', async () => {
		queryRecords
			.mockResolvedValueOnce(successResponse({pageNumber: 3}))
			.mockResolvedValueOnce(successResponse({pageNumber: 3}))
		render({objectApiName: 'Account', columns, searchFields: ['Name']})

		await flushPromises()

		expect(() => {
			controls().dispatchEvent(
				new CustomEvent('searchrequest', {detail: null, bubbles: true})
			)
			controls().dispatchEvent(new CustomEvent('pagerequest', {detail: null, bubbles: true}))
			table().dispatchEvent(new CustomEvent('sort', {detail: null}))
		}).not.toThrow()
		await flushPromises()

		expect(queryRecords).toHaveBeenCalledTimes(3)
		expect(queryRecords.mock.calls[1][0].searchTerm).toBe('')
		expect(queryRecords.mock.calls[2][0].pageNumber).toBe(1)
	})

	it('clears page-scoped selection after a successful refresh', async () => {
		const events = []
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('datachange', () => events.push('datachange'))
		element.addEventListener('selectionchange', () => events.push('selectionchange'))
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()

		table().dispatchEvent(
			new CustomEvent('rowselection', {
				detail: {selectedRows: [{Id: '001000000000001AAA', Name: 'Acme'}]}
			})
		)
		await flushPromises()
		expect(table().selectedRows).toEqual(['001000000000001AAA'])

		events.length = 0
		queryRecords.mockResolvedValueOnce(successResponse())
		element.refresh()
		await flushPromises()

		expect(events).toEqual(['datachange', 'selectionchange'])
		expect(table().selectedRows).toEqual([])
	})

	it('emits error before selectionchange when a refresh fails', async () => {
		const errorHandler = jest.fn()
		const selectionHandler = jest.fn()
		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('error', errorHandler)
		element.addEventListener('selectionchange', selectionHandler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		await flushPromises()

		table().dispatchEvent(
			new CustomEvent('rowselection', {
				detail: {selectedRows: [{Id: '001000000000001AAA', Name: 'Acme'}]}
			})
		)
		await flushPromises()

		errorHandler.mockClear()
		selectionHandler.mockClear()
		queryRecords.mockResolvedValueOnce(
			failureResponse({
				errorCode: 'QUERY_FAILED',
				message: 'The query could not be completed.'
			})
		)
		element.refresh()
		await flushPromises()

		expect(errorHandler).toHaveBeenCalledTimes(1)
		expect(selectionHandler).toHaveBeenCalledTimes(1)
		expect(errorHandler.mock.invocationCallOrder[0]).toBeLessThan(
			selectionHandler.mock.invocationCallOrder[0]
		)
		expect(selectionHandler.mock.calls[0][0].detail).toEqual({
			selectedRows: [],
			selectedRowKeys: []
		})
	})

	it('refresh() reuses the active request and returns undefined', async () => {
		render({objectApiName: 'Account', columns, searchFields: ['Name'], pageSize: 10})

		await flushPromises()

		controls().dispatchEvent(
			new CustomEvent('searchrequest', {detail: {searchTerm: 'acme'}, bubbles: true})
		)
		await flushPromises()

		table().dispatchEvent(
			new CustomEvent('sort', {detail: {fieldName: 'Name', sortDirection: 'asc'}})
		)
		await flushPromises()

		const activeRequest = queryRecords.mock.calls[queryRecords.mock.calls.length - 1][0]

		expect(element.refresh()).toBeUndefined()
		await flushPromises()

		expect(queryRecords.mock.calls[queryRecords.mock.calls.length - 1][0]).toEqual(
			activeRequest
		)
	})

	it('clears a prior error when a refresh succeeds', async () => {
		const rows = [{Id: '001000000000001AAA', Name: 'Acme'}]
		queryRecords.mockResolvedValueOnce(
			failureResponse({errorCode: 'INVALID_FIELD', message: 'Field is unavailable.'})
		)
		render({objectApiName: 'Account', columns})

		await flushPromises()
		expect(element.shadowRoot.querySelector('[data-id="errorMessage"]')).not.toBeNull()

		queryRecords.mockResolvedValueOnce(successResponse({rows}))
		element.refresh()
		await flushPromises()

		expect(element.shadowRoot.querySelector('[data-id="errorMessage"]')).toBeNull()
		expect(table().data).toEqual(rows)
	})

	it('ignores a stale success response after a newer request finishes', async () => {
		let resolveFirst
		let resolveSecond
		queryRecords
			.mockImplementationOnce(
				() =>
					new Promise(resolve => {
						resolveFirst = resolve
					})
			)
			.mockImplementationOnce(
				() =>
					new Promise(resolve => {
						resolveSecond = resolve
					})
			)
		const handler = jest.fn()
		const newerRows = [{Id: '001000000000002AAA', Name: 'Beta'}]
		const staleRows = [{Id: '001000000000001AAA', Name: 'Acme'}]

		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('datachange', handler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		element.refresh()

		resolveSecond(successResponse({rows: newerRows}))
		await flushPromises()
		handler.mockClear()

		resolveFirst(successResponse({rows: staleRows}))
		await flushPromises()

		expect(table().data).toEqual(newerRows)
		expect(handler).not.toHaveBeenCalled()
	})

	it('ignores a stale rejection after a newer request finishes', async () => {
		let rejectFirst
		queryRecords.mockImplementationOnce(
			() =>
				new Promise((resolve, reject) => {
					rejectFirst = reject
				})
		)
		const handler = jest.fn()
		const rows = [{Id: '001000000000002AAA', Name: 'Beta'}]

		element = createElement('c-datatable-plus', {is: DatatablePlus})
		element.addEventListener('error', handler)
		Object.assign(element, {objectApiName: 'Account', columns})
		document.body.appendChild(element)

		queryRecords.mockResolvedValueOnce(successResponse({rows}))
		element.refresh()
		await flushPromises()

		rejectFirst(new Error('stale'))
		await flushPromises()

		expect(table().data).toEqual(rows)
		expect(handler).not.toHaveBeenCalled()
	})
})
