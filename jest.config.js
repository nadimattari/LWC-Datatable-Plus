const {jestConfig} = require('@salesforce/sfdx-lwc-jest/config')

module.exports = {
	...jestConfig,
	coveragePathIgnorePatterns: ['<rootDir>/force-app/test/', '/__tests__/'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80
		}
	}
}
