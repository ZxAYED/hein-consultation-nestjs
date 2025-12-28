import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CommentService } from './comment.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { ROLE } from 'src/user/entities/role.entity';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(ROLE.ADMIN)
  create(@Req() req: Request & { user: any }, @Body() createCommentDto: any) {
    const commentData = {
      ...createCommentDto,
      userId: req.user.id,
    };
    console.log(commentData);
  }
}
