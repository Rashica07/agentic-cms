'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CalendarCheck, Plus, Loader2, X, ChevronLeft, ChevronRight, Users, Clock, Trash2,
  Settings2, Armchair, Globe, MessageCircle, PencilLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useReservations, useResources, useAvailabilityRules, useReservationMutations,
  ALLOWED_TRANSITIONS, STATUS_TONE, type Reservation, type ReservationStatus,
} from '@/hooks/useReservations';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SOURCE_ICON = { web: Globe, whatsapp: MessageCircle, manual: PencilLine } as const;

const toDateInput = (d: Date) => {
  // Local YYYY-MM-DD. toISOString() would shift the day across timezones.
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ReservationsPage() {
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [tab, setTab] = useState<'day' | 'setup'>('day');
  const [modalOpen, setModalOpen] = useState(false);

  // The API filters by range; one day = [00:00, next 00:00).
  const range = useMemo(() => {
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [date]);

  const { data: reservations, isLoading } = useReservations(range);
  const { data: resources } = useResources();
  const { data: rules } = useAvailabilityRules();
  const { update, remove } = useReservationMutations();

  const shiftDay = (delta: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setDate(toDateInput(d));
  };

  const setStatus = async (r: Reservation, status: ReservationStatus) => {
    try {
      await update.mutateAsync({ id: r.id, data: { status } });
      toast.success(`${r.customerName} → ${status.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not update booking');
    }
  };

  const del = async (r: Reservation) => {
    if (!confirm(`Delete the booking for ${r.customerName}?`)) return;
    try {
      await remove.mutateAsync(r.id);
      toast.success('Booking deleted');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete booking');
    }
  };

  const counts = useMemo(() => {
    const c: Partial<Record<ReservationStatus, number>> = {};
    for (const r of reservations ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [reservations]);

  const covers = (reservations ?? [])
    .filter((r) => ['pending', 'confirmed', 'seated'].includes(r.status))
    .reduce((sum, r) => sum + r.partySize, 0);

  return (
    <div className="max-w-6xl space-y-6 pb-10 anim-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.01em] text-foreground"> Reservations
          </h1>
          <p className="mt-1 text-sm text-neutral-400">Bookings, tables, and opening hours.</p>
        </div>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New booking
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['day', 'Day view'], ['setup', 'Tables & hours']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn('relative px-4 py-2 text-sm font-medium transition-colors', tab === id ? 'text-brand-fg' : 'text-neutral-400 hover:text-neutral-200')}
          >
            {label}
            {tab === id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      {tab === 'day' ? (
        <>
          {/* Day picker + at-a-glance numbers */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[150px] bg-surface-2 text-sm" />
              <Button variant="outline" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDate(toDateInput(new Date()))}>Today</Button>

            <div className="ml-auto flex items-center gap-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {covers} covers</span>
              {(['pending', 'confirmed', 'seated'] as const).map((s) =>
                counts[s] ? (
                  <span key={s} className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', STATUS_TONE[s])}>
                    {counts[s]} {s}
                  </span>
                ) : null,
              )}
            </div>
          </div>

          <Card className="bg-surface border-border shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !reservations?.length ? (
                <div className="py-16 text-center">
                  <CalendarCheck className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
                  <p className="text-sm font-medium text-neutral-400">No bookings for this day</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
                    {rules?.length
                      ? 'Add one manually, or take them from your site via the public booking API.'
                      : 'Set your opening hours under “Tables & hours” first — no hours means no bookable slots.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {reservations.map((r) => {
                    const SourceIcon = SOURCE_ICON[r.source] ?? PencilLine;
                    const next = ALLOWED_TRANSITIONS[r.status] ?? [];
                    return (
                      <div key={r.id} className="group flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-2/30">
                        <div className="w-14 shrink-0 text-center">
                          <p className="font-mono text-sm font-semibold text-foreground">{time(r.startsAt)}</p>
                          <p className="text-[10px] text-neutral-600">{time(r.endsAt)}</p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{r.customerName}</p>
                            <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', STATUS_TONE[r.status])}>
                              {r.status.replace('_', ' ')}
                            </span>
                            <SourceIcon className="h-3 w-3 shrink-0 text-neutral-600" aria-label={r.source} />
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                            {r.partySize} {r.partySize === 1 ? 'person' : 'people'}
                            {r.resource ? ` · ${r.resource.name}` : ' · unassigned'}
                            {r.customerPhone ? ` · ${r.customerPhone}` : r.customerEmail ? ` · ${r.customerEmail}` : ''}
                          </p>
                          {r.notes && <p className="mt-1 truncate text-[11px] italic text-neutral-500">“{r.notes}”</p>}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {/* Only transitions the server accepts are offered. */}
                          {next.map((s) => (
                            <Button key={s} variant="outline" size="sm" className="h-7 text-[11px] capitalize" disabled={update.isPending} onClick={() => setStatus(r, s)}>
                              {s.replace('_', ' ')}
                            </Button>
                          ))}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-500 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100" onClick={() => del(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <SetupTab />
      )}

      {modalOpen && <BookingModal date={date} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

// ─── TABLES & HOURS ────────────────────────────────────────────────────────────

function SetupTab() {
  const { data: resources, isLoading } = useResources();
  const { data: rules } = useAvailabilityRules();
  const { createResource, removeResource, updateResource, createRule, removeRule } = useReservationMutations();

  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [ruleDay, setRuleDay] = useState(1);
  const [open, setOpen] = useState('18:00');
  const [close, setClose] = useState('22:00');
  const [duration, setDuration] = useState(90);
  const [slot, setSlot] = useState(30);

  const addResource = async () => {
    if (!name.trim()) return toast.error('Name is required');
    try {
      await createResource.mutateAsync({ name: name.trim(), capacity });
      setName('');
      toast.success('Table added');
    } catch (err: any) { toast.error(err.message); }
  };

  const addRule = async () => {
    try {
      await createRule.mutateAsync({ dayOfWeek: ruleDay, openTime: open, closeTime: close, slotMinutes: slot, durationMinutes: duration });
      toast.success(`${DAYS[ruleDay]} hours added`);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Resources */}
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Armchair className="h-4 w-4 text-brand-fg" /> Tables
          </CardTitle>
          <CardDescription>What can be booked, and how many it seats.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Table 1" className="bg-surface-2 text-sm" />
            <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-20 bg-surface-2 text-sm" title="Seats" />
            <Button className="shrink-0 gap-1.5" disabled={createResource.isPending} onClick={addResource}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6 text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : !resources?.length ? (
            <p className="py-6 text-center text-xs text-neutral-500">No tables yet — nothing can be booked until you add one.</p>
          ) : (
            <div className="space-y-1">
              {resources.map((r) => (
                <div key={r.id} className={cn('group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2/50', !r.active && 'opacity-50')}>
                  <Armchair className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  <span className="flex-1 truncate text-sm text-foreground">{r.name}</span>
                  <span className="shrink-0 text-[11px] text-neutral-500">seats {r.capacity}</span>
                  <button
                    onClick={() => updateResource.mutate({ id: r.id, data: { active: !r.active } })}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-neutral-400 hover:text-foreground"
                    title={r.active ? 'Take out of service' : 'Return to service'}
                  >
                    {r.active ? 'active' : 'off'}
                  </button>
                  <button onClick={() => removeResource.mutate(r.id)} className="shrink-0 rounded p-1 text-neutral-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hours */}
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-brand-fg" /> Opening hours
          </CardTitle>
          <CardDescription>Add several per day for split shifts (lunch and dinner).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Day</Label>
              <select value={ruleDay} onChange={(e) => setRuleDay(Number(e.target.value))} className="h-9 w-full rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-foreground focus:outline-none">
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Opens</Label>
              <Input type="time" value={open} onChange={(e) => setOpen(e.target.value)} className="bg-surface-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Closes</Label>
              <Input type="time" value={close} onChange={(e) => setClose(e.target.value)} className="bg-surface-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sitting (min)</Label>
              <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="bg-surface-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slot every (min)</Label>
              <Input type="number" min={5} step={5} value={slot} onChange={(e) => setSlot(Number(e.target.value))} className="bg-surface-2 text-sm" />
            </div>
          </div>
          <Button className="w-full gap-1.5" disabled={createRule.isPending} onClick={addRule}>
            <Plus className="h-4 w-4" /> Add hours
          </Button>

          {!rules?.length ? (
            <p className="py-4 text-center text-xs text-neutral-500">No hours set — every day is closed.</p>
          ) : (
            <div className="space-y-1">
              {rules.map((rule) => (
                <div key={rule.id} className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2/50">
                  <span className="w-20 shrink-0 text-xs font-medium text-foreground">{DAYS[rule.dayOfWeek]}</span>
                  <span className="flex-1 font-mono text-xs text-neutral-400">{rule.openTime}–{rule.closeTime}</span>
                  <span className="shrink-0 text-[10px] text-neutral-600">{rule.durationMinutes}m sitting · /{rule.slotMinutes}m</span>
                  <button onClick={() => removeRule.mutate(rule.id)} className="shrink-0 rounded p-1 text-neutral-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── NEW BOOKING ───────────────────────────────────────────────────────────────

function BookingModal({ date, onClose }: { date: string; onClose: () => void }) {
  const { data: resources } = useResources();
  const { create } = useReservationMutations();

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '',
    partySize: 2, time: '19:00', notes: '', resourceId: '',
  });

  const fitting = (resources ?? []).filter((r) => r.active && r.capacity >= form.partySize);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) return toast.error('Name is required');
    try {
      await create.mutateAsync({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || null,
        customerEmail: form.customerEmail.trim() || null,
        partySize: form.partySize,
        startsAt: new Date(`${date}T${form.time}:00`).toISOString(),
        notes: form.notes.trim() || null,
        resourceId: form.resourceId || null,
        source: 'manual',
        status: 'confirmed', // staff taking a booking in person: already agreed
      });
      toast.success('Booking created');
      onClose();
    } catch (err: any) {
      // Surfaces the server's real reason — e.g. "Table 2 is already booked…"
      toast.error(err.message || 'Could not create booking');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-lg space-y-4 rounded-xl border border-border-strong bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">New booking · {date}</h3>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="cn">Customer name</Label>
            <Input id="cn" autoFocus required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="bg-surface-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ph">Phone</Label>
            <Input id="ph" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="bg-surface-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em">Email</Label>
            <Input id="em" type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="bg-surface-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ps">Party size</Label>
            <Input id="ps" type="number" min={1} required value={form.partySize} onChange={(e) => setForm({ ...form, partySize: Number(e.target.value), resourceId: '' })} className="bg-surface-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm">Time</Label>
            <Input id="tm" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="bg-surface-2" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="rs">Table</Label>
            <select id="rs" value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: e.target.value })} className="h-9 w-full rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-foreground focus:outline-none">
              <option value="">Leave unassigned</option>
              {/* Only tables big enough are listed — the server rejects the rest anyway. */}
              {fitting.map((r) => <option key={r.id} value={r.id}>{r.name} (seats {r.capacity})</option>)}
            </select>
            {fitting.length === 0 && (
              <p className="text-[11px] text-amber-400">No table seats {form.partySize}. You can still book it unassigned.</p>
            )}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="nt">Notes</Label>
            <Input id="nt" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Allergies, occasion, seating preference…" className="bg-surface-2" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create booking
          </Button>
        </div>
      </form>
    </div>
  );
}
