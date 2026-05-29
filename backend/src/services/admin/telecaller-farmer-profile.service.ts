import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
import { pincodeService } from '../core/pincode.service.js';
import { crmFarmerService } from './crm-farmer.service.js';

export type CropBlockInput = {
  cropName: string;
  acreage?: number;
  plantingDate?: string;
};

export type FarmerProfileInput = {
  name?: string;
  phone?: string;
  whatsappSame?: boolean;
  whatsappPhone?: string;
  language?: string;
  pincode?: string;
  village?: string;
  totalAcreage?: number;
  shippingAddress?: string;
  deliveryPincode?: string;
  assignedCropAdvisor?: string;
  roiEnabled?: boolean;
  farmerNotes?: string;
  cropBlocks?: CropBlockInput[];
};

function mapProfileRow(farmer: Record<string, unknown>, pincode?: { pincode: string; district: string; state: string } | null) {
  const meta = (farmer.metadata as Record<string, unknown>) ?? {};
  return {
    id: String(farmer.id),
    name: farmer.name ? String(farmer.name) : null,
    phone: farmer.phone ? String(farmer.phone) : null,
    whatsappSame: farmer.whatsapp_same_as_phone !== false,
    whatsappPhone: farmer.whatsapp_phone ? String(farmer.whatsapp_phone) : null,
    language: String(farmer.preferred_language ?? 'en'),
    pincode: pincode?.pincode ?? null,
    district: farmer.district ? String(farmer.district) : pincode?.district ?? null,
    state: farmer.state ? String(farmer.state) : pincode?.state ?? null,
    village: farmer.village ? String(farmer.village) : null,
    totalAcreage: farmer.total_acreage != null ? Number(farmer.total_acreage) : null,
    shippingAddress: farmer.shipping_address ? String(farmer.shipping_address) : null,
    deliveryPincode: farmer.delivery_pincode ? String(farmer.delivery_pincode) : null,
    assignedCropAdvisor: farmer.assigned_crop_advisor ? String(farmer.assigned_crop_advisor) : null,
    roiEnabled: Boolean(farmer.roi_enabled),
    farmerNotes: farmer.farmer_notes ? String(farmer.farmer_notes) : null,
    metadata: meta,
  };
}

export const telecallerFarmerProfileService = {
  async getProfile(farmerId: string) {
    const { data: farmer, error } = await supabase
      .from('farmers')
      .select(
        '*, pincode_master(pincode, district, state)'
      )
      .eq('id', farmerId)
      .single();
    if (error || !farmer) throw new NotFoundError('Farmer not found');

    const pm = farmer.pincode_master as { pincode?: string; district?: string; state?: string } | null;
    const blocks = await crmFarmerService.listBlocks(farmerId);

    const pinRow =
      pm?.pincode && pm.district && pm.state
        ? { pincode: pm.pincode, district: pm.district, state: pm.state }
        : null;
    return {
      profile: mapProfileRow(farmer as Record<string, unknown>, pinRow),
      cropBlocks: blocks.map((b) => {
        let dap: number | null = null;
        if (b.plantingDate) {
          const d = new Date(b.plantingDate);
          dap = Math.floor((Date.now() - d.getTime()) / 86400000);
          if (dap < 0) dap = null;
        }
        return {
          id: b.id,
          cropName: b.cropName ?? b.name,
          acreage: b.area,
          plantingDate: b.plantingDate,
          daysAfterPlanting: dap,
        };
      }),
    };
  },

  async updateProfile(farmerId: string, input: FarmerProfileInput) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name != null) updates.name = input.name.trim() || null;
    if (input.language != null) updates.preferred_language = input.language;
    if (input.village != null) updates.village = input.village.trim() || null;
    if (input.whatsappSame != null) updates.whatsapp_same_as_phone = input.whatsappSame;
    if (input.whatsappPhone != null) updates.whatsapp_phone = input.whatsappPhone.trim() || null;
    if (input.totalAcreage != null) updates.total_acreage = input.totalAcreage;
    if (input.shippingAddress != null) updates.shipping_address = input.shippingAddress.trim() || null;
    if (input.deliveryPincode != null) updates.delivery_pincode = input.deliveryPincode.replace(/\D/g, '').slice(0, 6) || null;
    if (input.assignedCropAdvisor != null) updates.assigned_crop_advisor = input.assignedCropAdvisor.trim() || null;
    if (input.roiEnabled != null) {
      updates.roi_enabled = input.roiEnabled;
      await supabase.from('farmer_roi_settings').upsert(
        { farmer_id: farmerId, opted_in: input.roiEnabled, updated_at: new Date().toISOString() },
        { onConflict: 'farmer_id' }
      );
    }
    if (input.farmerNotes != null) updates.farmer_notes = input.farmerNotes.trim() || null;

    const { error } = await supabase.from('farmers').update(updates).eq('id', farmerId);
    throwIfSupabaseError(error, 'Could not update farmer');

    if (input.pincode?.trim()) {
      await pincodeService.assignFarmerPincode(farmerId, input.pincode.trim());
    }

    if (input.cropBlocks?.length) {
      for (const block of input.cropBlocks) {
        if (!block.cropName?.trim()) continue;
        await crmFarmerService.createBlock(farmerId, {
          name: `${block.cropName.trim()} block`,
          cropName: block.cropName.trim(),
          area: block.acreage != null ? String(block.acreage) : undefined,
          plantingDate: block.plantingDate,
        });
      }
    }

    return this.getProfile(farmerId);
  },

  async applyProfileOnCreate(farmerId: string, input: FarmerProfileInput) {
    await this.updateProfile(farmerId, input);
  },
};
