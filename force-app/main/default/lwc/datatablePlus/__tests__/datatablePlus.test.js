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
})
