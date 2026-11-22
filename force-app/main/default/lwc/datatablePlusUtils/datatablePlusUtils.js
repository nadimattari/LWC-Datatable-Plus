const DEFAULT_PAGE_SIZE = 20
const MIN_PAGE_SIZE = 1
const MAX_PAGE_SIZE = 200
const MIN_PAGE_NUMBER = 1

export function normalizeRows(rows) {
	return Array.isArray(rows) ? rows : []
}

function toFiniteInteger(value) {
	return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null
}

export function clampPageSize(pageSize) {
	const value = toFiniteInteger(pageSize)

	if (value === null) {
		return DEFAULT_PAGE_SIZE
	}

	return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, value))
}

export function clampPageNumber(pageNumber) {
	const value = toFiniteInteger(pageNumber)

	return value === null ? MIN_PAGE_NUMBER : Math.max(MIN_PAGE_NUMBER, value)
}

function copyArray(value) {
	return Array.isArray(value) ? [...value] : []
}

function stringOr(value, fallback) {
	return typeof value === 'string' ? value : fallback
}

function sortDirectionOrNull(value) {
	const direction = typeof value === 'string' ? value.toUpperCase() : ''

	return direction === 'ASC' || direction === 'DESC' ? direction : null
}

export function createQueryRequest(input = {}) {
	const state = input || {}

	return {
		objectApiName: stringOr(state.objectApiName, ''),
		fields: copyArray(state.fields),
		searchFields: copyArray(state.searchFields),
		searchTerm: stringOr(state.searchTerm, ''),
		sortBy: stringOr(state.sortBy, null),
		sortDirection: sortDirectionOrNull(state.sortDirection),
		pageNumber: clampPageNumber(state.pageNumber),
		pageSize: clampPageSize(state.pageSize)
	}
}
