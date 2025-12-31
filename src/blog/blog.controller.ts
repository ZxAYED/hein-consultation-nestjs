import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Req,
  Get,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { ROLE } from 'src/user/entities/role.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { CreateBlogDto } from './dto/create-blog.dto';
import { generateUniqueSlug } from 'src/common/utils/generateUniqueSlug';
import { uploadFileToSupabase } from 'src/utils/common/uploadFileToSupabase';
import { BlogStatus } from '@prisma/client';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Controller('blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async create(
    @Req() req: Request & { user: any },
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!body?.data) throw new BadRequestException('Body data is required');
    if (!file) throw new BadRequestException('File is required');

    let parsed: any;
    try {
      parsed = JSON.parse(body.data);
    } catch {
      throw new BadRequestException('Invalid JSON in body data');
    }

    // ✅ Convert to DTO and validate
    const dtoInstance = plainToInstance(CreateBlogDto, parsed);
    try {
      await validateOrReject(dtoInstance, {
        validationError: { target: false },
      });
    } catch (errors) {
      const formattedErrors = errors
        .map((err: any) => Object.values(err.constraints))
        .flat();
      throw new BadRequestException(formattedErrors); // Will now return 400 with messages
    }

    // Generate slug
    const slug = await generateUniqueSlug(dtoInstance.title, this.blogService);

    // Upload image
    const imageLink = await uploadFileToSupabase(
      file,
      this.configService,
      'blog',
    );

    const adminId = req?.user?.id;
    const rawStatus = parsed?.status;
    const normalizedStatus =
      typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : null;

    const status =
      normalizedStatus === 'schedule'
        ? BlogStatus.Schedule
        : BlogStatus.Publish;

    const publishDate =
      status === BlogStatus.Publish
        ? new Date()
        : (() => {
            const value = parsed?.publishDate;
            const date = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(date.getTime())) {
              throw new BadRequestException('publishDate is required');
            }
            return date;
          })();

    const blogData: any = {
      ...dtoInstance,
      slug,
      image: imageLink,
      adminId,
      status,
      publishDate,
    };

    return await this.blogService.create(blogData);
  }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Get('myself-blogs')
  getMyselfBlogs(
    @Req() req: Request & { user: any },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('searchTerm') searchTerm?: string,
    @Query('status') status?: BlogStatus,
  ) {
    return this.blogService.getMyselfBlogs(
      req?.user?.id,
      page,
      limit,
      searchTerm,
      status,
    );
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('searchTerm') searchTerm?: string,
    @Query('status') status?: BlogStatus,
  ) {
    return this.blogService.findAll(page, limit, searchTerm, status); 
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.blogService.findBySlug2(slug);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateBlogDto: any) {
  //   return this.blogService.update(id, updateBlogDto);
  // }

  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  @Patch('/update-blog/:id')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async update(
    @Param('id') id: string,
    @Req() req: Request & { user: any },
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!body?.data && !file) {
      throw new BadRequestException(
        'At least one of data or file must be provided',
      );
    }

    let dtoInstance: UpdateBlogDto | null = null;

    // ✅ Handle data if exists
    if (body?.data) {
      let parsed: any;
      try {
        parsed = JSON.parse(body.data);
      } catch {
        throw new BadRequestException('Invalid JSON in body data');
      }

      dtoInstance = plainToInstance(UpdateBlogDto, parsed);

      try {
        await validateOrReject(dtoInstance, {
          validationError: { target: false },
        });
      } catch (errors) {
        const formattedErrors = errors
          .map((err: any) => Object.values(err.constraints))
          .flat();
        throw new BadRequestException(formattedErrors);
      }
    }

    const updateData: any = {};

    // ✅ Update fields only if they exist
    if (dtoInstance) {
      if (dtoInstance.title) {
        updateData.title = dtoInstance.title;
        updateData.slug = await generateUniqueSlug(
          dtoInstance.title,
          this.blogService,
        );
      }

      if (dtoInstance.excerpt) updateData.excerpt = dtoInstance.excerpt;
      if (dtoInstance.content) updateData.content = dtoInstance.content;
      if (dtoInstance.categories)
        updateData.categories = dtoInstance.categories;
      if (dtoInstance.tags) updateData.tags = dtoInstance.tags;
    }

    // ✅ Update file if exists
    if (file) {
      const imageLink = await uploadFileToSupabase(
        file,
        this.configService,
        'blog',
      );
      updateData.image = imageLink;
    }

    return await this.blogService.update(id, updateData);
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.blogService.remove(slug);
  }
}
