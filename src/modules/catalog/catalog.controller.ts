import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CatalogItemType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CatalogService } from './catalog.service';
import {
  CreateCatalogItemDto,
  CreateCategoryDto,
  CreateVariantDto,
  UpdateCatalogItemDto,
  UpdateCategoryDto,
  UpdateVariantDto,
} from './dto/catalog.dto';

@Controller('businesses/:businessId')
@UseGuards(JwtAuthGuard)
@ApiTags('Catalog')
@ApiBearerAuth('bearer')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Post('categories') createCategory(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: CreateCategoryDto,
  ) {
    return this.catalog.createCategory(u.id, b, d);
  }
  @Get('categories') listCategories(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Query('includeArchived', new ParseBoolPipe({ optional: true }))
    a?: boolean,
  ) {
    return this.catalog.listCategories(u.id, b, a);
  }
  @Patch('categories/:id') updateCategory(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateCategoryDto,
  ) {
    return this.catalog.updateCategory(u.id, b, id, d);
  }
  @Delete('categories/:id') archiveCategory(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.archiveCategory(u.id, b, id);
  }
  @Post('catalog') createItem(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Body() d: CreateCatalogItemDto,
  ) {
    return this.catalog.createItem(u.id, b, d);
  }
  @Get('catalog') listItems(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Query('type', new ParseEnumPipe(CatalogItemType, { optional: true }))
    type?: CatalogItemType,
    @Query('includeArchived', new ParseBoolPipe({ optional: true }))
    a?: boolean,
  ) {
    return this.catalog.listItems(u.id, b, type, a);
  }
  @Get('catalog/:id') getItem(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.getItem(u.id, b, id);
  }
  @Patch('catalog/:id') updateItem(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateCatalogItemDto,
  ) {
    return this.catalog.updateItem(u.id, b, id, d);
  }
  @Delete('catalog/:id') archiveItem(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.archiveItem(u.id, b, id);
  }
  @Post('catalog/:id/variants') createVariant(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: CreateVariantDto,
  ) {
    return this.catalog.createVariant(u.id, b, id, d);
  }
  @Patch('catalog/:id/variants/:variantId') updateVariant(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) v: string,
    @Body() d: UpdateVariantDto,
  ) {
    return this.catalog.updateVariant(u.id, b, id, v, d);
  }
  @Delete('catalog/:id/variants/:variantId') archiveVariant(
    @CurrentUser() u: AuthUser,
    @Param('businessId', ParseUUIDPipe) b: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) v: string,
  ) {
    return this.catalog.archiveVariant(u.id, b, id, v);
  }
}
