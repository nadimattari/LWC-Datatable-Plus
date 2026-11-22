import {api, LightningElement} from 'lwc'
import queryRecords from '@salesforce/apex/DatatablePlusQueryService.query'
import {
	clampPageNumber,
	clampPageSize,
	createQueryRequest,
	normalizeRows
} from 'c/datatablePlusUtils'

const GENERIC_ERROR = {
	errorCode: 'QUERY_FAILED',
	message: 'The query could not be completed.'
}

function normalizeError(value) {
	const error = value && typeof value === 'object' ? value : null
	const errorCode =
		error && typeof error.errorCode === 'string' && error.errorCode
			? error.errorCode
			: GENERIC_ERROR.errorCode
	const message =
		error && typeof error.message === 'string' && error.message
			? error.message
			: GENERIC_ERROR.message

	return {errorCode, message}
}

function normalizeCount(value) {
	return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

export default class DatatablePlus extends LightningElement {
	@api objectApiName = ''
	@api columns = []
	@api keyField = 'Id'
	@api searchFields = []
	@api title = ''

	pageSizeValue = 20
	rows = []
	totalItemCount = 0
	pageNumber = 1
	searchTerm = ''
	sortBy = null
	sortDirection = null
	isLoading = false
	error = null

	@api
	get pageSize() {
		return this.pageSizeValue
	}

	set pageSize(value) {
		this.pageSizeValue = clampPageSize(value)
	}

	get tableColumns() {
		return Array.isArray(this.columns) ? this.columns : []
	}

	get normalizedTitle() {
		return typeof this.title === 'string' ? this.title.trim() : ''
	}

	get hasTitle() {
		return Boolean(this.normalizedTitle)
	}

	get tableLabel() {
		const objectName = typeof this.objectApiName === 'string' ? this.objectApiName.trim() : ''

		return this.normalizedTitle || objectName || 'Records'
	}

	get errorMessage() {
		return this.error ? this.error.message : ''
	}

	get statusMessage() {
		if (this.isLoading) {
			return 'Loading records'
		}

		if (this.rows.length > 0) {
			return 'Records loaded'
		}

		return this.error ? '' : 'No records to display.'
	}

	get showEmptyState() {
		return !this.isLoading && !this.error && this.rows.length === 0
	}

	connectedCallback() {
		this.loadData()
	}

	async loadData() {
		this.isLoading = true

		let response

		try {
			response = await queryRecords(this.buildRequest())
		} catch {
			this.isLoading = false
			this.applyError(null)

			return
		}

		this.isLoading = false

		if (response && response.ok) {
			this.applySuccess(response)
		} else {
			this.applyError(response ? response.error : null)
		}
	}

	buildRequest() {
		return createQueryRequest({
			objectApiName: this.objectApiName,
			fields: this.queryFields(),
			searchFields: this.searchFields,
			searchTerm: this.searchTerm,
			sortBy: this.sortBy,
			sortDirection: this.sortDirection,
			pageNumber: this.pageNumber,
			pageSize: this.pageSize
		})
	}

	queryFields() {
		const fields = []
		const keyField = typeof this.keyField === 'string' ? this.keyField.trim() : ''

		if (keyField) {
			fields.push(keyField)
		}

		for (const column of this.tableColumns) {
			const fieldName =
				column && typeof column.fieldName === 'string' ? column.fieldName.trim() : ''

			if (fieldName && !fields.includes(fieldName)) {
				fields.push(fieldName)
			}
		}

		return fields
	}

	applySuccess(response) {
		this.rows = normalizeRows(response.rows)
		this.totalItemCount = normalizeCount(response.totalItemCount)
		this.pageNumber = clampPageNumber(response.pageNumber)
		this.pageSizeValue = clampPageSize(response.pageSize)
		this.error = null

		this.dispatchEvent(
			new CustomEvent('datachange', {
				detail: {
					rows: [...this.rows],
					totalItemCount: this.totalItemCount,
					pageNumber: this.pageNumber,
					pageSize: this.pageSize
				},
				bubbles: true,
				composed: true
			})
		)
	}

	applyError(value) {
		const detail = normalizeError(value)

		this.error = detail
		this.rows = []
		this.totalItemCount = 0

		this.dispatchEvent(
			new CustomEvent('error', {
				detail: {...detail},
				bubbles: true,
				composed: true
			})
		)
	}
}
