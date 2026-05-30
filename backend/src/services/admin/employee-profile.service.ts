import { randomUUID } from 'node:crypto';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';

export const employeeProfileService = {
  async list(filters?: { role?: string; status?: string; search?: string; limit?: number }) {
    let q = supabase
      .from('employee_profiles')
      .select('*, employee_compensation(*), employee_attendance_rules(*)')
      .order('created_at', { ascending: false })
      .limit(Math.min(200, Math.max(1, filters?.limit ?? 80)));
    if (filters?.role) q = q.eq('role', filters.role);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.search) {
      const s = filters.search.trim();
      q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,employee_code.ilike.%${s}%`);
    }
    const { data, error } = await q;
    throwIfSupabaseError(error, 'Could not load employees');
    return data ?? [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('employee_profiles')
      .select('*, employee_compensation(*), employee_attendance_rules(*)')
      .eq('id', id)
      .maybeSingle();
    throwIfSupabaseError(error, 'Could not load employee');
    if (!data) throw new NotFoundError('Employee not found');
    return data;
  },

  async create(input: {
    fullName: string;
    email?: string;
    role: string;
    status?: 'active' | 'inactive';
    personalMobile?: string;
    companyWhatsapp?: string;
    alternateMobile?: string;
    gender?: string;
    dateOfBirth?: string;
    joiningDate?: string;
    department?: string;
    reportingManagerId?: string | null;
    employmentType?: string;
    state?: string;
    district?: string;
    taluk?: string;
    pincodeId?: string | null;
    address?: string;
    languages?: string[];
    cropsExpertise?: string[];
    diseaseKnowledgeRating?: number;
    whatsappSkillRating?: number;
    customerHandlingRating?: number;
    fieldExperienceYears?: number;
    compensation?: Record<string, unknown>;
    attendanceRules?: Record<string, unknown>;
    adminUserId?: string | null;
  }) {
    const employeeCode = `EMP-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('employee_profiles')
      .insert({
        admin_user_id: input.adminUserId ?? null,
        employee_code: employeeCode,
        full_name: input.fullName,
        email: input.email ?? null,
        role: input.role,
        status: input.status ?? 'active',
        personal_mobile: input.personalMobile ?? null,
        company_whatsapp: input.companyWhatsapp ?? null,
        alternate_mobile: input.alternateMobile ?? null,
        gender: input.gender ?? null,
        date_of_birth: input.dateOfBirth ?? null,
        joining_date: input.joiningDate ?? null,
        department: input.department ?? null,
        reporting_manager_id: input.reportingManagerId ?? null,
        employment_type: input.employmentType ?? 'full_time',
        state: input.state ?? null,
        district: input.district ?? null,
        taluk: input.taluk ?? null,
        pincode_id: input.pincodeId ?? null,
        address: input.address ?? null,
        languages: input.languages ?? [],
        crops_expertise: input.cropsExpertise ?? [],
        disease_knowledge_rating: input.diseaseKnowledgeRating ?? 0,
        whatsapp_skill_rating: input.whatsappSkillRating ?? 0,
        customer_handling_rating: input.customerHandlingRating ?? 0,
        field_experience_years: input.fieldExperienceYears ?? 0,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();
    throwIfSupabaseError(error, 'Could not create employee');

    const profileId = String(data.id);
    await supabase.from('employee_compensation').upsert({
      employee_profile_id: profileId,
      ...(input.compensation ?? {}),
      updated_at: now,
    });
    await supabase.from('employee_attendance_rules').upsert({
      employee_profile_id: profileId,
      ...(input.attendanceRules ?? {}),
      updated_at: now,
    });
    return this.getById(profileId);
  },

  async update(
    id: string,
    input: {
      fullName?: string;
      email?: string;
      role?: string;
      status?: 'active' | 'inactive';
      personalMobile?: string;
      companyWhatsapp?: string;
      alternateMobile?: string;
      gender?: string;
      dateOfBirth?: string;
      joiningDate?: string;
      department?: string;
      reportingManagerId?: string | null;
      employmentType?: string;
      state?: string;
      district?: string;
      taluk?: string;
      pincodeId?: string | null;
      address?: string;
      languages?: string[];
      cropsExpertise?: string[];
      diseaseKnowledgeRating?: number;
      whatsappSkillRating?: number;
      customerHandlingRating?: number;
      fieldExperienceYears?: number;
      compensation?: Record<string, unknown>;
      attendanceRules?: Record<string, unknown>;
    }
  ) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.email !== undefined) patch.email = input.email;
    if (input.role !== undefined) patch.role = input.role;
    if (input.status !== undefined) patch.status = input.status;
    if (input.personalMobile !== undefined) patch.personal_mobile = input.personalMobile;
    if (input.companyWhatsapp !== undefined) patch.company_whatsapp = input.companyWhatsapp;
    if (input.alternateMobile !== undefined) patch.alternate_mobile = input.alternateMobile;
    if (input.gender !== undefined) patch.gender = input.gender;
    if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth;
    if (input.joiningDate !== undefined) patch.joining_date = input.joiningDate;
    if (input.department !== undefined) patch.department = input.department;
    if (input.reportingManagerId !== undefined) patch.reporting_manager_id = input.reportingManagerId;
    if (input.employmentType !== undefined) patch.employment_type = input.employmentType;
    if (input.state !== undefined) patch.state = input.state;
    if (input.district !== undefined) patch.district = input.district;
    if (input.taluk !== undefined) patch.taluk = input.taluk;
    if (input.pincodeId !== undefined) patch.pincode_id = input.pincodeId;
    if (input.address !== undefined) patch.address = input.address;
    if (input.languages !== undefined) patch.languages = input.languages;
    if (input.cropsExpertise !== undefined) patch.crops_expertise = input.cropsExpertise;
    if (input.diseaseKnowledgeRating !== undefined) patch.disease_knowledge_rating = input.diseaseKnowledgeRating;
    if (input.whatsappSkillRating !== undefined) patch.whatsapp_skill_rating = input.whatsappSkillRating;
    if (input.customerHandlingRating !== undefined) patch.customer_handling_rating = input.customerHandlingRating;
    if (input.fieldExperienceYears !== undefined) patch.field_experience_years = input.fieldExperienceYears;

    const { error } = await supabase.from('employee_profiles').update(patch).eq('id', id);
    throwIfSupabaseError(error, 'Could not update employee');

    if (input.compensation) {
      await supabase.from('employee_compensation').upsert({
        employee_profile_id: id,
        ...input.compensation,
        updated_at: now,
      });
    }
    if (input.attendanceRules) {
      await supabase.from('employee_attendance_rules').upsert({
        employee_profile_id: id,
        ...input.attendanceRules,
        updated_at: now,
      });
    }
    if (input.status !== undefined) {
      await this.syncAdminActive(id, input.status === 'active');
    }

    return this.getById(id);
  },

  /** Accept employee_profiles.id or linked admin_users.id. */
  async resolveStaffReference(id: string): Promise<{
    profileId: string | null;
    adminUserId: string | null;
  }> {
    const { data: asProfile, error: profileErr } = await supabase
      .from('employee_profiles')
      .select('id, admin_user_id')
      .eq('id', id)
      .maybeSingle();
    throwIfSupabaseError(profileErr, 'Could not resolve employee');
    if (asProfile) {
      return {
        profileId: String(asProfile.id),
        adminUserId: asProfile.admin_user_id ? String(asProfile.admin_user_id) : null,
      };
    }

    const { data: byAdmin, error: adminErr } = await supabase
      .from('employee_profiles')
      .select('id, admin_user_id')
      .eq('admin_user_id', id)
      .maybeSingle();
    throwIfSupabaseError(adminErr, 'Could not resolve employee');
    if (byAdmin) {
      return {
        profileId: String(byAdmin.id),
        adminUserId: String(byAdmin.admin_user_id),
      };
    }

    return { profileId: null, adminUserId: id };
  },

  async syncAdminActive(profileId: string, active: boolean): Promise<void> {
    const { data: profile, error } = await supabase
      .from('employee_profiles')
      .select('admin_user_id')
      .eq('id', profileId)
      .maybeSingle();
    throwIfSupabaseError(error, 'Could not load employee profile');
    if (!profile?.admin_user_id) return;

    const { error: updErr } = await supabase
      .from('admin_users')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', profile.admin_user_id);
    throwIfSupabaseError(updErr, 'Could not sync console login status');
  },
};
