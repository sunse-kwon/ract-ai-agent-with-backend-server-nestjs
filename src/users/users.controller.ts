import { Controller, Body, Get, Put, Delete, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../core/entities/users/users.entity'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdatePasswordDto } from './dto/update-password.dto'

@Controller('users')
export class UsersController {
    constructor(private userService: UsersService) {}

    @Get('/me')
    async findUser(@Req() req): Promise<User[]> {
        const result = await this.userService.readUser(req.user.id, req.user.jti);
        return result
    }
    
    @Put('/me')
    async updateUser(@Req() req, @Body() body: UpdateUserDto): Promise<User> {
        const result = await this.userService.updateUser(req.user.id, req.user.jti, body)
        return result
    }
    
    @Put('/me/password')
    async updatePassword(@Req() req, @Body() body: UpdatePasswordDto): Promise<User> {
        const result = await this.userService.updateUserPassword(req.user.id, req.user.jti, body)
        return result
    }

    @Delete('/me')
    async deleteUser(@Req() req): Promise<any> {
        const result = await this.userService.deleteUser(req.user.id, req.user.jti)
        return result
    }
}
