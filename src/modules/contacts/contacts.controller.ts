import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
@Controller('businesses/:businessId')
@UseGuards(JwtAuthGuard)
@ApiTags('Contacts')
@ApiBearerAuth('bearer')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}
  @Post('customers') createCustomer(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: CreateContactDto,
  ) {
    return this.contacts.createCustomer(u.id, b, d);
  }
  @Get('customers') listCustomers(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Query('includeArchived', new ParseBoolPipe({ optional: true }))
    a?: boolean,
  ) {
    return this.contacts.listCustomers(u.id, b, a);
  }
  @Get('customers/:id') customer(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.customer(u.id, b, id);
  }
  @Patch('customers/:id') updateCustomer(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateContactDto,
  ) {
    return this.contacts.updateCustomer(u.id, b, id, d);
  }
  @Delete('customers/:id') archiveCustomer(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.archiveCustomer(u.id, b, id);
  }
  @Post('suppliers') createSupplier(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: CreateContactDto,
  ) {
    return this.contacts.createSupplier(u.id, b, d);
  }
  @Get('suppliers') listSuppliers(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Query('includeArchived', new ParseBoolPipe({ optional: true }))
    a?: boolean,
  ) {
    return this.contacts.listSuppliers(u.id, b, a);
  }
  @Get('suppliers/:id') supplier(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.supplier(u.id, b, id);
  }
  @Patch('suppliers/:id') updateSupplier(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateContactDto,
  ) {
    return this.contacts.updateSupplier(u.id, b, id, d);
  }
  @Delete('suppliers/:id') archiveSupplier(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.archiveSupplier(u.id, b, id);
  }
}
