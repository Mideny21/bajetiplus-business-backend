import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Businesses')
@ApiBearerAuth('bearer')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get('industry-profiles') industries() {
    return this.businesses.industries();
  }
  @Post('businesses') create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.businesses.create(user.id, dto);
  }
  @Get('businesses') list(@CurrentUser() user: AuthUser) {
    return this.businesses.list(user.id);
  }
  @Get('businesses/:businessId') get(
    @CurrentUser() user: AuthUser,
    @Param('businessId', ParseUUIDPipe) id: string,
  ) {
    return this.businesses.getOwned(user.id, id);
  }
  @Patch('businesses/:businessId') update(
    @CurrentUser() user: AuthUser,
    @Param('businessId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businesses.update(user.id, id, dto);
  }
}
