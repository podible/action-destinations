import { ActionDefinition, IntegrationError } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import Salesforce, { generateSalesforceRequest } from '../sf-operations'
import {
  bulkUpsertExternalId,
  bulkUpdateRecordId,
  customFields,
  operation,
  traits,
  validateLookup,
  enable_batching,
  recordMatcherOperator,
  batch_size,
  hideIfDeleteOperation
} from '../sf-properties'
import type { Payload } from './generated-types'

const OBJECT_NAME = 'Opportunity'

const action: ActionDefinition<Settings, Payload> = {
  title: 'Opportunity',
  description: 'Create, update, or upsert opportunities in Salesforce.',
  fields: {
    operation: operation,
    recordMatcherOperator: recordMatcherOperator,
    enable_batching: enable_batching,
    batch_size: batch_size,
    traits: traits,
    bulkUpsertExternalId: bulkUpsertExternalId,
    bulkUpdateRecordId: bulkUpdateRecordId,
    close_date: {
      label: 'Close Date',
      description:
        'Date when the opportunity is expected to close. Use yyyy-MM-dd format. **This is required to create an opportunity.**',
      type: 'string',
      depends_on: hideIfDeleteOperation
    },
    name: {
      label: 'Name',
      description: 'A name for the opportunity. **This is required to create an opportunity.**',
      type: 'string',
      depends_on: hideIfDeleteOperation
    },
    stage_name: {
      label: 'Stage Name',
      description: 'Current stage of the opportunity. **This is required to create an opportunity.**',
      type: 'string',
      depends_on: hideIfDeleteOperation
    },
    amount: {
      label: 'Amount',
      description: 'Estimated total sale amount.',
      type: 'string',
      depends_on: hideIfDeleteOperation
    },
    description: {
      label: 'Description',
      description: 'A text description of the opportunity.',
      type: 'string',
      depends_on: hideIfDeleteOperation
    },
    customFields: customFields
  },
  perform: async (request, { settings, payload }) => {
    const sf: Salesforce = new Salesforce(settings.instanceUrl, await generateSalesforceRequest(settings, request))

    if (payload.operation === 'create') {
      if (!payload.close_date || !payload.name || !payload.stage_name) {
        throw new IntegrationError('Missing close_date, name or stage_name value', 'Misconfigured required field', 400)
      }
      return await sf.createRecord(payload, OBJECT_NAME)
    }

    validateLookup(payload)

    if (payload.operation === 'update') {
      return await sf.updateRecord(payload, OBJECT_NAME)
    }

    if (payload.operation === 'upsert') {
      if (!payload.close_date || !payload.name || !payload.stage_name) {
        throw new IntegrationError('Missing close_date, name or stage_name value', 'Misconfigured required field', 400)
      }
      return await sf.upsertRecord(payload, OBJECT_NAME)
    }

    if (payload.operation === 'delete') {
      return await sf.deleteRecord(payload, OBJECT_NAME)
    }
  },
  performBatch: async (request, { settings, payload, features, statsContext, logger }) => {
    const sf: Salesforce = new Salesforce(settings.instanceUrl, await generateSalesforceRequest(settings, request))

    if (payload[0].operation === 'upsert') {
      if (!payload[0].close_date || !payload[0].name || !payload[0].stage_name) {
        throw new IntegrationError('Missing close_date, name or stage_name value', 'Misconfigured required field', 400)
      }
    }

    let shouldShowAdvancedLogging = false
    if (features && features['salesforce-advanced-logging']) {
      shouldShowAdvancedLogging = true
    }

    return sf.bulkHandler(payload, OBJECT_NAME, { shouldLog: shouldShowAdvancedLogging, stats: statsContext, logger })
  }
}

export default action
