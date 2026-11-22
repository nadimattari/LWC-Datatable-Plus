import {api, LightningElement} from 'lwc'
import {clampPageNumber, clampPageSize} from 'c/datatablePlusUtils'

const FIRST_PAGE = 1
const SEARCH_DEBOUNCE_MS = 300

export default class QueryControls extends LightningElement {
	@api pageNumber = FIRST_PAGE
	@api pageSize = 20
	@api totalItemCount = 0
	@api searchEnabled = false

	searchTermValue = ''
	draftSearchTerm = ''
	searchTimerId

	@api
	get searchTerm() {
		return this.searchTermValue
	}

	set searchTerm(value) {
		this.searchTermValue = typeof value === 'string' ? value : ''
		this.draftSearchTerm = this.searchTermValue
	}

	get searchDisabled() {
		return !this.searchEnabled
	}

	get currentPage() {
		return clampPageNumber(this.pageNumber)
	}

	get totalPages() {
		const count = Math.max(0, Math.trunc(Number(this.totalItemCount) || 0))

		return Math.max(FIRST_PAGE, Math.ceil(count / clampPageSize(this.pageSize)))
	}

	get pageStatus() {
		return `Page ${this.currentPage} of ${this.totalPages}`
	}

	get isFirstPageDisabled() {
		return this.currentPage <= FIRST_PAGE
	}

	get isPreviousPageDisabled() {
		return this.currentPage <= FIRST_PAGE
	}

	get isNextPageDisabled() {
		return this.currentPage >= this.totalPages
	}

	get isLastPageDisabled() {
		return this.currentPage >= this.totalPages
	}

	disconnectedCallback() {
		this.clearSearchTimer()
	}

	handleSearchChange(event) {
		this.draftSearchTerm = this.readSearchValue(event)
		this.clearSearchTimer()
		// Debouncing user input needs a cancellable timer. The callback is cleared on
		// commit and disconnect so it cannot outlive the component.
		// eslint-disable-next-line @lwc/lwc/no-async-operation
		this.searchTimerId = setTimeout(() => {
			this.searchTimerId = undefined
			this.dispatchSearchRequest(this.draftSearchTerm)
		}, SEARCH_DEBOUNCE_MS)
	}

	handleSearchCommit(event) {
		this.clearSearchTimer()
		this.draftSearchTerm = this.readSearchValue(event, this.draftSearchTerm)
		this.dispatchSearchRequest(this.draftSearchTerm)
	}

	handleFirstPage() {
		if (this.isFirstPageDisabled) {
			return
		}

		this.dispatchPageRequest(FIRST_PAGE)
	}

	handlePreviousPage() {
		if (this.isPreviousPageDisabled) {
			return
		}

		this.dispatchPageRequest(this.currentPage - 1)
	}

	handleNextPage() {
		if (this.isNextPageDisabled) {
			return
		}

		this.dispatchPageRequest(this.currentPage + 1)
	}

	handleLastPage() {
		if (this.isLastPageDisabled) {
			return
		}

		this.dispatchPageRequest(this.totalPages)
	}

	readSearchValue(event, fallback = '') {
		const value = event.detail && event.detail.value

		return typeof value === 'string' ? value : fallback
	}

	clearSearchTimer() {
		if (this.searchTimerId !== undefined) {
			clearTimeout(this.searchTimerId)
			this.searchTimerId = undefined
		}
	}

	dispatchSearchRequest(value) {
		this.dispatchEvent(
			new CustomEvent('searchrequest', {
				detail: {searchTerm: value.trim()},
				bubbles: true,
				composed: false
			})
		)
	}

	dispatchPageRequest(pageNumber) {
		this.dispatchEvent(
			new CustomEvent('pagerequest', {
				detail: {pageNumber: clampPageNumber(pageNumber)},
				bubbles: true,
				composed: false
			})
		)
	}
}
