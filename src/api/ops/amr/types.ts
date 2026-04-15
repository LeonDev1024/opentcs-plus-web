export interface OpsAmrVehicle {
  id: string | number;
  name: string;
  vehicleTypeName?: string;
  state?: string;
  currentPosition?: string;
  energyLevel?: number;
  integrationLevel?: string;
  currentTransportOrder?: string;
}

export interface OpsActionResult {
  actionId: string;
  accepted: boolean;
  status: string;
  reasonCode?: string;
  reasonMessage?: string;
  traceId: string;
  estimatedFinishTime?: string;
}

export interface ModeSwitchRequest {
  targetMode: 'AUTOMATIC' | 'MANUAL';
  executePolicy: 'REJECT_IF_BUSY' | 'PAUSE_THEN_SWITCH';
  reason?: string;
}

export interface MapSwitchRequest {
  targetMapId: string;
  targetMapVersion?: string;
  initPosition?: string;
  fallbackMapId?: string;
}

export interface GoChargeRequest {
  chargePolicy: 'NEAREST' | 'SPECIFIED_STATION';
  stationId?: string;
  interruptPolicy: 'WAIT_CURRENT_TASK' | 'INTERRUPT_NOW';
  minSocThreshold?: number;
}

export interface MoveRequest {
  moveType: 'MOVE_TO_NODE' | 'INIT_POSITION';
  targetNodeId?: string;
  mapId?: string;
  x?: number;
  y?: number;
  theta?: number;
  confirmRisk?: boolean;
}

export interface OpsActionRecord {
  actionId: string;
  traceId: string;
  vehicleName: string;
  actionCategory: string;
  actionType: string;
  executeStatus: string;
  operatedAt: string;
}
