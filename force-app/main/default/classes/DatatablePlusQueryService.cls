public with sharing class DatatablePlusQueryService {
	private static final String INVALID_INPUT = 'INVALID_INPUT';
	private static final String INVALID_OBJECT = 'INVALID_OBJECT';
	private static final String INVALID_FIELD = 'INVALID_FIELD';
	private static final String INVALID_SEARCH_FIELD = 'INVALID_SEARCH_FIELD';
	private static final String QUERY_FAILED = 'QUERY_FAILED';
	private static final Integer DEFAULT_PAGE_NUMBER = 1;
	private static final Integer DEFAULT_PAGE_SIZE = 20;
	private static final Integer MIN_PAGE_SIZE = 1;
	private static final Integer MAX_PAGE_SIZE = 200;
	private static final Integer MAX_OFFSET = 2000;

	@AuraEnabled(cacheable=true)
	public static DatatablePlusQueryResponse query(DatatablePlusQueryRequest request) {
		DatatablePlusQueryResponse response = createResponse(request);

		try {
			Schema.DescribeSObjectResult objectDescribe = describeObject(
				request == null ? null : request.objectApiName
			);
			DatatablePlusQueryError validationError = validate(request, objectDescribe);

			if (validationError != null) {
				applyFailure(response, validationError);
				return response;
			}

			Map<String, Object> binds = new Map<String, Object>();
			String whereClause = buildWhereClause(request, objectDescribe, binds);
			String countQuery = 'SELECT COUNT() FROM ' + objectDescribe.getName() + whereClause;
			Integer totalItemCount = Database.countQueryWithBinds(
				countQuery,
				binds,
				AccessLevel.USER_MODE
			);
			List<SObject> rows = Database.queryWithBinds(
				buildQuery(request, objectDescribe, whereClause),
				binds,
				AccessLevel.USER_MODE
			);

			response.ok = true;
			response.rows = rows;
			response.totalItemCount = totalItemCount;
			response.error = null;
		} catch (Exception error) {
			System.debug(
				LoggingLevel.ERROR,
				'DatatablePlusQueryService query failed: ' + error.getTypeName()
			);
			applyFailure(
				response,
				new DatatablePlusQueryError(QUERY_FAILED, 'The query could not be completed.')
			);
		}

		return response;
	}

	private static DatatablePlusQueryResponse createResponse(DatatablePlusQueryRequest request) {
		DatatablePlusQueryResponse response = new DatatablePlusQueryResponse();

		if (request != null) {
			if (request.pageNumber != null && request.pageNumber >= DEFAULT_PAGE_NUMBER) {
				response.pageNumber = request.pageNumber;
			}

			if (
				request.pageSize != null &&
				request.pageSize >= MIN_PAGE_SIZE &&
				request.pageSize <= MAX_PAGE_SIZE
			) {
				response.pageSize = request.pageSize;
			}
		}

		return response;
	}

	private static void applyFailure(
		DatatablePlusQueryResponse response,
		DatatablePlusQueryError error
	) {
		response.ok = false;
		response.rows = new List<SObject>();
		response.totalItemCount = 0;
		response.error = error;
	}

	private static DatatablePlusQueryError validate(
		DatatablePlusQueryRequest request,
		Schema.DescribeSObjectResult objectDescribe
	) {
		if (request == null) {
			return new DatatablePlusQueryError(INVALID_INPUT, 'The query request is missing.');
		}

		if (String.isBlank(request.objectApiName)) {
			return new DatatablePlusQueryError(
				INVALID_INPUT,
				'objectApiName must be a non-blank value.'
			);
		}

		if (request.fields == null || request.fields.isEmpty()) {
			return new DatatablePlusQueryError(
				INVALID_INPUT,
				'fields must contain at least one value.'
			);
		}

		if (request.pageNumber == null || request.pageNumber < DEFAULT_PAGE_NUMBER) {
			return new DatatablePlusQueryError(INVALID_INPUT, 'pageNumber must be at least one.');
		}

		if (
			request.pageSize == null ||
			request.pageSize < MIN_PAGE_SIZE ||
			request.pageSize > MAX_PAGE_SIZE
		) {
			return new DatatablePlusQueryError(
				INVALID_INPUT,
				'pageSize must be between one and two hundred.'
			);
		}

		if (calculateOffset(request) > MAX_OFFSET) {
			return new DatatablePlusQueryError(
				INVALID_INPUT,
				'pageNumber and pageSize exceed the maximum query offset.'
			);
		}

		if (String.isNotBlank(request.searchTerm) && listOrEmpty(request.searchFields).isEmpty()) {
			return new DatatablePlusQueryError(
				INVALID_INPUT,
				'searchFields must contain at least one value when searchTerm is supplied.'
			);
		}

		for (String fieldName : request.fields) {
			if (String.isBlank(fieldName) || fieldName.trim().contains('.')) {
				return new DatatablePlusQueryError(
					INVALID_FIELD,
					'A requested field is not valid.'
				);
			}
		}

		for (String fieldName : listOrEmpty(request.searchFields)) {
			if (String.isBlank(fieldName) || fieldName.trim().contains('.')) {
				return new DatatablePlusQueryError(
					INVALID_SEARCH_FIELD,
					'A search field is not valid.'
				);
			}
		}

		DatatablePlusQueryError sortError = validateSort(request);

		if (sortError != null) {
			return sortError;
		}

		if (objectDescribe == null || !objectDescribe.isAccessible()) {
			return new DatatablePlusQueryError(
				INVALID_OBJECT,
				'The requested object is not available.'
			);
		}

		Map<String, Schema.SObjectField> fieldMap = objectDescribe.fields.getMap();
		Set<String> selectedFields = new Set<String>();

		for (String fieldName : request.fields) {
			Schema.SObjectField field = fieldMap.get(fieldKey(fieldName));

			if (field == null || !field.getDescribe().isAccessible()) {
				return new DatatablePlusQueryError(
					INVALID_FIELD,
					'A requested field is not available.'
				);
			}

			selectedFields.add(fieldKey(fieldName));
		}

		for (String fieldName : listOrEmpty(request.searchFields)) {
			Schema.SObjectField field = fieldMap.get(fieldKey(fieldName));

			if (field == null || !field.getDescribe().isAccessible()) {
				return new DatatablePlusQueryError(
					INVALID_SEARCH_FIELD,
					'A search field is not available.'
				);
			}

			if (!isSearchable(field.getDescribe().getType())) {
				return new DatatablePlusQueryError(
					INVALID_SEARCH_FIELD,
					'A search field is not text-searchable.'
				);
			}
		}

		if (
			String.isNotBlank(request.sortBy) && !selectedFields.contains(fieldKey(request.sortBy))
		) {
			return new DatatablePlusQueryError(
				INVALID_INPUT,
				'sortBy must be one of the requested fields.'
			);
		}

		if (String.isNotBlank(request.sortBy)) {
			Schema.SObjectField sortField = fieldMap.get(fieldKey(request.sortBy));

			if (sortField == null || !sortField.getDescribe().isSortable()) {
				return new DatatablePlusQueryError(
					INVALID_INPUT,
					'sortBy must be a sortable field.'
				);
			}
		}

		return null;
	}

	private static DatatablePlusQueryError validateSort(DatatablePlusQueryRequest request) {
		Boolean hasSortBy = String.isNotBlank(request.sortBy);
		Boolean hasSortDirection = String.isNotBlank(request.sortDirection);

		if (!hasSortBy && !hasSortDirection) {
			return null;
		}

		if (!hasSortBy || !hasSortDirection) {
			return new DatatablePlusQueryError(
				INVALID_INPUT,
				'sortBy and sortDirection must be supplied together.'
			);
		}

		String direction = request.sortDirection.trim().toUpperCase();

		if (direction != 'ASC' && direction != 'DESC') {
			return new DatatablePlusQueryError(INVALID_INPUT, 'sortDirection must be ASC or DESC.');
		}

		return null;
	}

	private static Schema.DescribeSObjectResult describeObject(String objectApiName) {
		if (String.isBlank(objectApiName)) {
			return null;
		}

		try {
			List<Schema.DescribeSObjectResult> describes = Schema.describeSObjects(
				new List<String>{ objectApiName.trim() }
			);

			return describes.isEmpty() ? null : describes[0];
		} catch (Exception error) {
			System.debug(
				LoggingLevel.ERROR,
				'DatatablePlusQueryService describe failed: ' + error.getTypeName()
			);
			return null;
		}
	}

	private static Long calculateOffset(DatatablePlusQueryRequest request) {
		return ((Long) request.pageNumber - 1) * request.pageSize;
	}

	private static List<String> listOrEmpty(List<String> values) {
		return values == null ? new List<String>() : values;
	}

	private static String fieldKey(String fieldName) {
		return fieldName.trim().toLowerCase();
	}

	private static Boolean isSearchable(Schema.DisplayType fieldType) {
		return fieldType == Schema.DisplayType.STRING ||
			fieldType == Schema.DisplayType.TEXTAREA ||
			fieldType == Schema.DisplayType.EMAIL ||
			fieldType == Schema.DisplayType.URL ||
			fieldType == Schema.DisplayType.PHONE;
	}

	private static String buildWhereClause(
		DatatablePlusQueryRequest request,
		Schema.DescribeSObjectResult objectDescribe,
		Map<String, Object> binds
	) {
		if (String.isBlank(request.searchTerm) || listOrEmpty(request.searchFields).isEmpty()) {
			return '';
		}

		Map<String, Schema.SObjectField> fieldMap = objectDescribe.fields.getMap();
		List<String> clauses = new List<String>();
		String searchValue = '%' + request.searchTerm.trim() + '%';
		Integer index = 0;

		for (String fieldName : request.searchFields) {
			String bindName = 'dtpSearch' + index;
			binds.put(bindName, searchValue);
			String canonicalName = fieldMap.get(fieldKey(fieldName)).getDescribe().getName();
			clauses.add(canonicalName + ' LIKE :' + bindName);
			index++;
		}

		return ' WHERE (' + String.join(clauses, ' OR ') + ')';
	}

	private static String buildQuery(
		DatatablePlusQueryRequest request,
		Schema.DescribeSObjectResult objectDescribe,
		String whereClause
	) {
		Map<String, Schema.SObjectField> fieldMap = objectDescribe.fields.getMap();
		List<String> fieldNames = new List<String>();
		Set<String> seenFieldNames = new Set<String>();

		for (String fieldName : request.fields) {
			String canonicalName = fieldMap.get(fieldKey(fieldName)).getDescribe().getName();

			if (seenFieldNames.add(canonicalName)) {
				fieldNames.add(canonicalName);
			}
		}

		String soql =
			'SELECT ' +
			String.join(fieldNames, ', ') +
			' FROM ' +
			objectDescribe.getName() +
			whereClause;

		if (String.isNotBlank(request.sortBy)) {
			Schema.SObjectField sortField = fieldMap.get(fieldKey(request.sortBy));
			String direction = request.sortDirection.trim().toUpperCase();
			soql += ' ORDER BY ' + sortField.getDescribe().getName() + ' ' + direction;
		} else {
			soql += ' ORDER BY Id';
		}

		return soql + ' LIMIT ' + request.pageSize + ' OFFSET ' + calculateOffset(request);
	}
}
