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
import { CreateSaleDto } from './dto/sale.dto';
import { SalesService } from './sales.service';
@Controller('businesses/:businessId/sales')
@UseGuards(JwtAuthGuard)
@ApiTags('Sales')
@ApiBearerAuth('bearer')
export class SalesController {
  constructor(private readonly sales: SalesService) {}
  @Post() create(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: CreateSaleDto,
  ) {
    return this.sales.create(u.id, b, d);
  }
  @Get() list(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
  ) {
    return this.sales.list(u.id, b);
  }
  @Get(':id') get(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sales.get(u.id, b, id);
  }
}
