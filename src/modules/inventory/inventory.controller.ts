import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { AdjustInventoryDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';
@Controller('businesses/:businessId/inventory')
@UseGuards(JwtAuthGuard)
@ApiTags('Inventory')
@ApiBearerAuth('bearer')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get() list(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
  ) {
    return this.inventory.list(u.id, b);
  }
  @Get('movements') history(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Query('catalogItemId') item?: string,
  ) {
    return this.inventory.history(u.id, b, item);
  }
  @Post('adjustments') adjust(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: AdjustInventoryDto,
  ) {
    return this.inventory.adjust(u.id, b, d);
  }
}
