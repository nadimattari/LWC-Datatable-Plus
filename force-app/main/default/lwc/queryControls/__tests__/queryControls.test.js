import {createElement} from 'lwc'
import QueryControls from 'c/queryControls'

const SEARCH_DEBOUNCE_MS = 300

describe('c-query-controls', () => {
	let element

	beforeEach(() => {
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.clearAllTimers()
		jest.useRealTimers()

		while (document.body.firstChild) {
			document.body.removeChild(document.body.firstChild)
		}
	})

	function render(props = {}) {
		element = createElement('c-query-controls', {is: QueryControls})
		Object.assign(element, props)
		document.body.appendChild(element)
		return element
	}

	function pageButtons() {
		return Array.from(element.shadowRoot.querySelectorAll('lightning-button'))
	}

	function dispatchInputEvent(name, value) {
		const input = element.shadowRoot.querySelector('lightning-input')
		input.dispatchEvent(new CustomEvent(name, {detail: {value}}))
	}

	it('emits a trimmed search request after the debounce delay', () => {
		const handler = jest.fn()
		render({searchEnabled: true})
		element.addEventListener('searchrequest', handler)

		dispatchInputEvent('change', '  acme  ')

		expect(handler).not.toHaveBeenCalled()

		jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
		expect(handler).not.toHaveBeenCalled()

		jest.advanceTimersByTime(1)
		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0][0].detail).toEqual({searchTerm: 'acme'})
	})

	it('restarts the debounce delay when a newer value arrives', () => {
		const handler = jest.fn()
		render({searchEnabled: true})
		element.addEventListener('searchrequest', handler)

		dispatchInputEvent('change', 'a')
		jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 100)
		dispatchInputEvent('change', 'ab')
		jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)

		expect(handler).not.toHaveBeenCalled()

		jest.advanceTimersByTime(1)
		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0][0].detail).toEqual({searchTerm: 'ab'})
	})

	it('emits the committed search immediately and cancels the pending debounce', () => {
		const handler = jest.fn()
		render({searchEnabled: true})
		element.addEventListener('searchrequest', handler)

		dispatchInputEvent('change', 'acme')
		dispatchInputEvent('commit', 'acme')

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0][0].detail).toEqual({searchTerm: 'acme'})
		expect(handler.mock.calls[0][0].bubbles).toBe(true)
		expect(handler.mock.calls[0][0].composed).toBe(false)

		jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS)
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('uses the commit payload as the source of truth when it is present', () => {
		const handler = jest.fn()
		render({searchEnabled: true, searchTerm: 'stale'})
		element.addEventListener('searchrequest', handler)

		dispatchInputEvent('commit', '  fresh  ')

		expect(handler.mock.calls[0][0].detail).toEqual({searchTerm: 'fresh'})
	})

	it('falls back to the latest draft when a commit has no string value', () => {
		const handler = jest.fn()
		render({searchEnabled: true})
		element.addEventListener('searchrequest', handler)

		dispatchInputEvent('change', 'draft')
		dispatchInputEvent('commit', undefined)

		expect(handler.mock.calls[0][0].detail).toEqual({searchTerm: 'draft'})
	})

	it('emits an empty search request when the committed value is blank', () => {
		const handler = jest.fn()
		render({searchEnabled: true, searchTerm: 'acme'})
		element.addEventListener('searchrequest', handler)

		dispatchInputEvent('change', '   ')
		dispatchInputEvent('commit', '   ')

		expect(handler.mock.calls[0][0].detail).toEqual({searchTerm: ''})
	})

	it('treats a non-string change value as an empty search', () => {
		const handler = jest.fn()
		render({searchEnabled: true})
		element.addEventListener('searchrequest', handler)

		dispatchInputEvent('change', undefined)
		jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS)

		expect(handler.mock.calls[0][0].detail).toEqual({searchTerm: ''})
	})

	it('cancels a pending search request when the component disconnects', () => {
		const handler = jest.fn()
		render({searchEnabled: true})
		element.addEventListener('searchrequest', handler)

		dispatchInputEvent('change', 'acme')
		document.body.removeChild(element)
		jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS)

		expect(handler).not.toHaveBeenCalled()
	})

	it('renders a labelled search input when search is enabled', () => {
		render({searchEnabled: true, searchTerm: 'existing'})

		const input = element.shadowRoot.querySelector('lightning-input')

		expect(input).not.toBeNull()
		expect(input.type).toBe('search')
		expect(input.label).toBe('Search records')
		expect(input.value).toBe('existing')
		expect(input.disabled).toBe(false)
	})

	it('disables the search input when search is disabled', () => {
		render({searchEnabled: false})

		const input = element.shadowRoot.querySelector('lightning-input')

		expect(input).not.toBeNull()
		expect(input.disabled).toBe(true)
	})

	it('renders four labelled, keyboard-reachable page buttons', () => {
		render({pageNumber: 2, pageSize: 20, totalItemCount: 60})

		expect(pageButtons().map(button => button.label)).toEqual([
			'First page',
			'Previous page',
			'Next page',
			'Last page'
		])
		expect(pageButtons().every(button => button.variant === 'neutral')).toBe(true)
	})

	it('emits page requests for first, previous, next, and last', () => {
		const handler = jest.fn()
		render({pageNumber: 3, pageSize: 20, totalItemCount: 100})
		element.addEventListener('pagerequest', handler)

		pageButtons().forEach(button => button.click())

		expect(handler.mock.calls.map(call => call[0].detail)).toEqual([
			{pageNumber: 1},
			{pageNumber: 2},
			{pageNumber: 4},
			{pageNumber: 5}
		])
		expect(handler.mock.calls.every(call => call[0].bubbles)).toBe(true)
		expect(handler.mock.calls.every(call => !call[0].composed)).toBe(true)
	})

	it('disables first and previous on page one', () => {
		render({pageNumber: 1, pageSize: 20, totalItemCount: 60})

		expect(pageButtons().map(button => button.disabled)).toEqual([true, true, false, false])
	})

	it('disables next and last on the final page', () => {
		render({pageNumber: 3, pageSize: 20, totalItemCount: 60})

		expect(pageButtons().map(button => button.disabled)).toEqual([false, false, true, true])
	})

	it('ignores a page request from a disabled boundary button', () => {
		const handler = jest.fn()
		render({pageNumber: 1, pageSize: 20, totalItemCount: 60})
		element.addEventListener('pagerequest', handler)

		pageButtons()[0].click()
		pageButtons()[1].click()

		expect(handler).not.toHaveBeenCalled()
	})

	it('reports the sanitized current page and total page count', () => {
		render({pageNumber: 0, pageSize: 0, totalItemCount: -5})

		const status = element.shadowRoot.querySelector('[data-id="pageStatus"]')

		expect(status.textContent).toContain('Page 1 of 1')
	})

	it('computes the total page count from the row count and page size', () => {
		render({pageNumber: 2, pageSize: 20, totalItemCount: 41})

		const status = element.shadowRoot.querySelector('[data-id="pageStatus"]')

		expect(status.textContent).toContain('Page 2 of 3')
	})

	it('exposes the committed search term as a public property', () => {
		render({searchEnabled: true, searchTerm: 'acme'})

		expect(element.searchTerm).toBe('acme')
	})

	it('treats a non-string search term as empty', () => {
		render({searchEnabled: true, searchTerm: 42})

		expect(element.searchTerm).toBe('')
		expect(element.shadowRoot.querySelector('lightning-input').value).toBe('')
	})

	it('treats a change event without detail as an empty search', () => {
		const handler = jest.fn()
		render({searchEnabled: true})
		element.addEventListener('searchrequest', handler)

		const input = element.shadowRoot.querySelector('lightning-input')
		input.dispatchEvent(new CustomEvent('change'))
		jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS)

		expect(handler.mock.calls[0][0].detail).toEqual({searchTerm: ''})
	})

	it('ignores page requests from disabled next and last buttons', () => {
		const handler = jest.fn()
		render({pageNumber: 3, pageSize: 20, totalItemCount: 60})
		element.addEventListener('pagerequest', handler)

		pageButtons()[2].click()
		pageButtons()[3].click()

		expect(handler).not.toHaveBeenCalled()
	})
})
