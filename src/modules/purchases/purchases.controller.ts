import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreatePurchaseDto } from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';
@Controller('businesses/:businessId/purchases')
@UseGuards(JwtAuthGuard)
@ApiTags('Purchases')
@ApiBearerAuth('bearer')
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}
  @Post() create(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: CreatePurchaseDto,
  ) {
    return this.purchases.create(u.id, b, d);
  }
  @Get() list(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
  ) {
    return this.purchases.list(u.id, b);
  }
  @Get(':id') get(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchases.get(u.id, b, id);
  }
}
