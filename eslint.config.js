const lwcConfig = require('@salesforce/eslint-config-lwc')

module.exports = [
	{
		ignores: ['node_modules/', 'coverage/', '.sf/', '.sfdx/']
	},
	...lwcConfig.configs.recommended,
	...lwcConfig.configs.i18n
]
