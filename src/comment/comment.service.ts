import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  create(createCommentDto: CreateCommentDto) {
    
    console.log(createCommentDto)
  }

  
}
