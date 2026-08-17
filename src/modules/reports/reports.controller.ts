import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';
@Controller('businesses/:businessId/reports')
@UseGuards(JwtAuthGuard)
@ApiTags('Reports')
@ApiBearerAuth('bearer')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get('dashboard') dashboard(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.dashboard(u.id, b, q);
  }
}
