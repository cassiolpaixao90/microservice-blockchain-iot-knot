import moment from 'moment-timezone';
import { IDeviceDocument, DeviceRepo, IWaterFlowDocument, WaterFlowRepo } from "../data-abstracts/repositories/index";
import * as mongoose from 'mongoose';
import { logger } from '../../middleware/common/Logging';
import { WaterFlowUtils } from '../../middleware/common/Utils';
export class WaterFlowDataAgent {
    
    private waterFlowUtils: WaterFlowUtils;
    private waterFlow: any;
    private moments: moment;

    constructor() { 
        this.moments = moment;
        this.waterFlowUtils = new WaterFlowUtils();
    }

    async createNewWaterFlow(data: any) {

        this.waterFlow = {
            uuid: data.fromUuid,
            flowRate: data.message.flowRate
        }

        const uuid = this.waterFlow.uuid;
        const flowRate = this.waterFlow.flowRate;
            
        let newWaterFlow = <IWaterFlowDocument>(this.waterFlow);
        console.log("newWaterFlow", newWaterFlow)
        let addWaterFlow = await WaterFlowRepo.create(newWaterFlow);
        const [total] = await WaterFlowRepo.aggregate([
            {
                $project: {
                    flowRate: '$flowRate',
                    uuid: '$uuid',
                    month: { $month: '$timestamp' }
                }
            },
            { $match: { uuid, month: this.moments().month() + 1 } },
            { $group: { _id: null, flowRate: { $sum: '$flowRate' } } }
        ])

        const liters = total.flowRate / 60;
        const cost = this.waterFlowUtils.calculateCost(liters);
        logger.info('UUID:', uuid, 'Total (L):', liters, 'Cost:', cost);
    }

    async getAllWaterFlows(): Promise<any> {

    }

    async getWaterFlowById(waterFlowId: string): Promise<any> {
        let objectId = mongoose.Types.ObjectId;
        if (!objectId.isValid(waterFlowId)) {
            return { status: 401, message: "incorrect waterFlow id" }
        }
        let result = await WaterFlowRepo.findById(waterFlowId);
        if (result.errors) {
            return { thrown: true, success: false, status: 422, message: "db is currently unable to process request" }
        }
        return result;
    }

}