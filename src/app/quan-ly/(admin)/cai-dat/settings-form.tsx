'use client'

import { useActionState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import type { Settings } from '@/server/costing/service'
import { saveSettingsAction, type AdminState } from '../../_actions'

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<AdminState, FormData>(saveSettingsAction, null)
  return (
    <Card className="mt-3">
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="Công mỗi giờ (đ)" hint="giá trị bạn muốn trả cho chính mình">
          <input name="labourPerHourVnd" type="number" min={0} step={1000} defaultValue={settings.labourPerHourVnd} className={fieldClass} />
        </Field>
        <Field label="Giá điện (đ/kWh)">
          <input name="electricityPerKwhVnd" type="number" min={0} step={100} defaultValue={settings.electricityPerKwhVnd} className={fieldClass} />
        </Field>
        <Field label="Công suất lò (kW)">
          <input name="ovenKw" type="number" min={0} step={0.1} defaultValue={settings.ovenKw} className={fieldClass} />
        </Field>
        <Field label="Phí cổng thanh toán mỗi tháng (đ)" hint="chia đều cho số đơn 30 ngày gần nhất">
          <input name="paymentPlanMonthlyVnd" type="number" min={0} step={1000} defaultValue={settings.paymentPlanMonthlyVnd} className={fieldClass} />
        </Field>
        <Field label="Tiệm bù phí giao mỗi đơn (đ)">
          <input name="deliverySubsidyVnd" type="number" min={0} step={1000} defaultValue={settings.deliverySubsidyVnd} className={fieldClass} />
        </Field>
        <Field label="Nguyên liệu tối đa (%)" hint="vượt mức này thì trang giá vốn cảnh báo">
          <input name="targetIngredientPct" type="number" min={1} max={99} defaultValue={Math.round(settings.targetIngredientPct * 100)} className={fieldClass} />
        </Field>
        <Field label="Lãi thật mong muốn (%)" hint="dùng để gợi ý giá bán">
          <input name="targetMarginPct" type="number" min={1} max={90} defaultValue={Math.round(settings.targetMarginPct * 100)} className={fieldClass} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <SubmitButton>Lưu cách tính</SubmitButton>
          <ActionResult state={state} />
        </div>
      </form>
      <p className="mt-2 text-[13px] text-muted">Đổi số ở đây thì giá vốn mọi món tính lại ngay. Đơn đã đặt giữ nguyên giá vốn lúc đặt.</p>
    </Card>
  )
}
