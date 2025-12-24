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
import { Blog, BlogStatus, Prisma } from '@prisma/client';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // @UseGuards(AuthGuard)
  // @Roles(ROLE.ADMIN)
  // @Post()
  // @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  // async create(
  //   @Req() req: Request & { user: any },
  //   @Body() body: any,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   if (!body?.data) throw new BadRequestException('Body data is required');
  //   if (!file) throw new BadRequestException('File is required');

  //   let parsed: CreateBlogDto;
  //   try {
  //     parsed = JSON.parse(body.data);
  //   } catch {
  //     throw new BadRequestException('Invalid JSON in body data');
  //   }

  //   // Generate unique slug
  //   const slug = await generateUniqueSlug(parsed.title, this.blogService);

  //   // Upload image
  //   const imageLink = await uploadFileToSupabase(
  //     file,
  //     this.configService,
  //     'blog',
  //   );

  //   // Add adminId from request user
  //   const adminId = req?.user?.id;

  //   const status = BlogStatus.Publish;

  //   const blogData = {
  //     ...parsed,
  //     slug,
  //     image: imageLink,
  //     adminId,
  //     status,
  //     publishDate: new Date(),
  //   } as Blog;
  //   return await this.blogService.create(blogData);
  // }

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
    const status = BlogStatus.Publish;
    const publishDate = new Date();

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
  ) {
    return this.blogService.getMyselfBlogs(req?.user?.id, page, limit);
  }

  @Get()
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('searchTerm') searchTerm?: string) {
    return this.blogService.findAll(page, limit, searchTerm);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.blogService.findBySlug2(slug);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: any) {
    return this.blogService.update(id, updateBlogDto);
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.blogService.remove(slug);
  }
}
