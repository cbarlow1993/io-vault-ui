# Vault Integration Tests

This directory contains integration tests for vault-related event handlers.

## vault-created-event.test.ts

Integration tests for the `VAULT_CREATED` EventBridge event handler.

### What It Tests

The test suite validates the complete end-to-end flow of vault creation through EventBridge:

1. **Event Publishing**: Publishes a VAULT_CREATED event to the Vault Event Bus
2. **Event Processing**: Validates that EventBridge triggers the Lambda handler
3. **Address Creation**: Verifies that addresses are created in DynamoDB for all default chains
4. **Address Validation**: Ensures addresses are correctly formatted for each chain type
5. **Data Integrity**: Checks metadata, timestamps, and GSI key formatting
6. **Idempotency**: Confirms the handler can be run multiple times safely
7. **Error Handling**: Tests behavior with invalid vault IDs
8. **Cleanup**: Verifies test data can be properly cleaned up

### Prerequisites

#### Required Environment Variables

```bash
# Test vault ID - this vault must exist in your test database
export CLIENT_ID_1_VAULT_ID="your-test-vault-id"

# Vault Event Bus Name - the EventBridge event bus to publish events to
export VAULT_EVENT_BUS_NAME="io-vault-cldsvc-eventbus-dev"  # or your environment's event bus
```

#### Required Database Setup

The test vault must have:

1. **VaultCurve records**: At least one curve (e.g., secp256k1) with an xpub
   ```sql
   INSERT INTO "VaultCurve" ("vaultId", "curve", "xpub", "createdAt", "updatedAt")
   VALUES ('your-test-vault-id', 'secp256k1', 'xpub...', NOW(), NOW());
   ```

2. **Vault record**: Basic vault information
   ```sql
   INSERT INTO "Vault" ("id", "workspaceId", "organisationId", "createdAt", "updatedAt")
   VALUES ('your-test-vault-id', 'test-workspace-id', 'test-org-id', NOW(), NOW());
   ```

### Running the Tests

#### Run all vault integration tests:
```bash
npm run test:integration -- vaults
```

#### Run only the vault-created-event tests:
```bash
npm run test:integration -- vault-created-event
```

#### Run with verbose output:
```bash
npm run test:integration -- vault-created-event --reporter=verbose
```

### Test Structure

The test suite is organized into the following sections:

#### 1. Successful Event Processing
- Validates address creation for all default chains (ETH, BSC, Polygon, Arbitrum, Solana, XRP)
- Checks address properties and structure
- Tests different ecosystem support (EVM, Solana, XRPL)
- Verifies idempotency

#### 2. Address Validation
- Chain-specific address format validation
- EVM: `0x` prefix + 40 hex characters
- Solana: 32-44 character base58
- XRP: Starts with 'r' + 24-34 characters

#### 3. Error Handling
- Non-existent vault handling
- Ensures no partial data on failure

#### 4. Data Cleanup Verification
- Tests the cleanup utility works correctly
- Validates all addresses are removed after cleanup

#### 5. Chain-Specific Address Generation
- Ensures addresses are unique per chain
- Verifies deterministic generation (same vault = same addresses)

#### 6. Metadata Verification
- Timestamp validation
- Derivation path handling
- Empty token array initialization

### Cleanup

The tests use `beforeEach` and `afterEach` hooks to ensure:
- Test data is cleaned up before each test
- Test data is cleaned up after each test
- No test data persists between test runs

The cleanup is performed using the `deleteVaultAddresses` utility from `tests/integration/utils/`.

### Expected Behavior

For a successful test run, the system should:
1. Publish a VAULT_CREATED event to the EventBridge Vault Event Bus
2. EventBridge routes the event to the `processVaultCreated` Lambda function
3. Lambda queries the database for vault curves and details
4. Lambda generates addresses for 6 default chains
5. Lambda stores each address in DynamoDB with status UNMONITORED
6. Lambda sets up proper GSI keys for querying
7. Test waits 5 seconds for asynchronous processing
8. Test queries DynamoDB to verify addresses were created
9. Test cleanup removes all created addresses

### Common Issues

#### Issue: "Vault curves not found" error or no addresses created
**Solution**: Ensure the CLIENT_ID_1_VAULT_ID environment variable points to a vault that exists in your test database with proper VaultCurve records.

#### Issue: Event not processed / addresses not created after 5 seconds
**Solution**: 
- Verify the VAULT_EVENT_BUS_NAME is correct for your environment
- Check that the Lambda function has proper EventBridge trigger configured
- Check CloudWatch logs for the `processVaultCreated` Lambda function
- Increase wait time if your environment is slower (edit `waitForEventProcessing(5)` in tests)

#### Issue: Addresses not cleaned up
**Solution**: Check that the DynamoDB table permissions allow deletion, and that the `deleteVaultAddresses` utility has the correct table configuration.

#### Issue: Test timeouts
**Solution**: Integration tests may take longer due to database operations. Increase the test timeout in vitest.config.ts if needed.

### Database Queries for Debugging

Check if vault exists:
```sql
SELECT * FROM "Vault" WHERE "id" = 'your-test-vault-id';
```

Check vault curves:
```sql
SELECT * FROM "VaultCurve" WHERE "vaultId" = 'your-test-vault-id';
```

Check created addresses (DynamoDB - use AWS CLI):
```bash
aws dynamodb query \
  --table-name AddressesTable \
  --index-name GSI1 \
  --key-condition-expression "GSI1PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"VAULT#your-test-vault-id"}}'
```

### Maintenance

When updating the default chains in `src/handlers/events/vault-created-event.ts`, also update:
1. The `EXPECTED_CHAINS` constant in the test file
2. Expected address count assertions (currently 6)
3. Chain-specific validation cases if new ecosystems are added

