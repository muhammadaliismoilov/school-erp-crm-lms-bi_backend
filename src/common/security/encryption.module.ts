import { Global, Module } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";

/**
 * Global so any bounded context handling confidential fields can inject
 * EncryptionService without re-wiring the provider.
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
