import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CommentService } from './comment.service';
import { Roles } from 'src/common/decorator/rolesDecorator';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';


@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}
  @UseGuards(AuthGuard)
  @Roles()
  @Post()
  async create(@Req() req: Request & { user: any }, @Body() body: CreateCommentDto) {
    // console.log(req.user)

    const commentData ={
      ...body,
      userId: req.user.id as string
    }

    // console.log(commentData)

    return await this.commentService.create(commentData);
  }
}
