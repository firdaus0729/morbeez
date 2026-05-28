import { randomUUID } from 'node:crypto';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
export const employeeProfileService = {
    async list(filters) {
        let q = supabase
            .from('employee_profiles')
            .select('*, employee_compensation(*), employee_attendance_rules(*)')
            .order('created_at', { ascending: false })
            .limit(Math.min(200, Math.max(1, filters?.limit ?? 80)));
        if (filters?.role)
            q = q.eq('role', filters.role);
        if (filters?.status)
            q = q.eq('status', filters.status);
        if (filters?.search) {
            const s = filters.search.trim();
            q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,employee_code.ilike.%${s}%`);
        }
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load employees');
        return data ?? [];
    },
    async getById(id) {
        const { data, error } = await supabase
            .from('employee_profiles')
            .select('*, employee_compensation(*), employee_attendance_rules(*)')
            .eq('id', id)
            .maybeSingle();
        throwIfSupabaseError(error, 'Could not load employee');
        if (!data)
            throw new NotFoundError('Employee not found');
        return data;
    },
    async create(input) {
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
    async update(id, input) {
        const now = new Date().toISOString();
        const patch = { updated_at: now };
        if (input.fullName !== undefined)
            patch.full_name = input.fullName;
        if (input.email !== undefined)
            patch.email = input.email;
        if (input.role !== undefined)
            patch.role = input.role;
        if (input.status !== undefined)
            patch.status = input.status;
        if (input.personalMobile !== undefined)
            patch.personal_mobile = input.personalMobile;
        if (input.companyWhatsapp !== undefined)
            patch.company_whatsapp = input.companyWhatsapp;
        if (input.alternateMobile !== undefined)
            patch.alternate_mobile = input.alternateMobile;
        if (input.gender !== undefined)
            patch.gender = input.gender;
        if (input.dateOfBirth !== undefined)
            patch.date_of_birth = input.dateOfBirth;
        if (input.joiningDate !== undefined)
            patch.joining_date = input.joiningDate;
        if (input.department !== undefined)
            patch.department = input.department;
        if (input.reportingManagerId !== undefined)
            patch.reporting_manager_id = input.reportingManagerId;
        if (input.employmentType !== undefined)
            patch.employment_type = input.employmentType;
        if (input.state !== undefined)
            patch.state = input.state;
        if (input.district !== undefined)
            patch.district = input.district;
        if (input.taluk !== undefined)
            patch.taluk = input.taluk;
        if (input.pincodeId !== undefined)
            patch.pincode_id = input.pincodeId;
        if (input.address !== undefined)
            patch.address = input.address;
        if (input.languages !== undefined)
            patch.languages = input.languages;
        if (input.cropsExpertise !== undefined)
            patch.crops_expertise = input.cropsExpertise;
        if (input.diseaseKnowledgeRating !== undefined)
            patch.disease_knowledge_rating = input.diseaseKnowledgeRating;
        if (input.whatsappSkillRating !== undefined)
            patch.whatsapp_skill_rating = input.whatsappSkillRating;
        if (input.customerHandlingRating !== undefined)
            patch.customer_handling_rating = input.customerHandlingRating;
        if (input.fieldExperienceYears !== undefined)
            patch.field_experience_years = input.fieldExperienceYears;
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
        return this.getById(id);
    },
};
//# sourceMappingURL=employee-profile.service.js.map