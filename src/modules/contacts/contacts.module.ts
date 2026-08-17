import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
@Module({
  imports: [BusinessesModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
