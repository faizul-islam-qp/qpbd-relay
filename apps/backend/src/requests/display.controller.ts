import { Controller, Get } from '@nestjs/common'
import { RequestsService } from './requests.service'

@Controller('display')
export class DisplayController {
  constructor(private service: RequestsService) {}

  @Get('active')
  getActive() {
    return this.service.findAll(
      { id: 'display', role: 'admin' },
      { status: undefined },
    ).then(({ data }) =>
      data.filter((r: any) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status))
    )
  }
}
