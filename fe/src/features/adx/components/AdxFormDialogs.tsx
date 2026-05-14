import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Save, Trash2 } from 'lucide-react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { adxApi } from '@/features/adx/api'
import {
  ACCOUNT_STATUS_OPTIONS,
  CONVERSION_TYPE_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
} from '@/features/adx/components/AdxShared'
import {
  adxAccountSchema,
  adxAccountConversionSchema,
  adxGameSchema,
  adxLinkSchema,
  type AdxAccount,
  type AdxAccountFormValues,
  type AdxAccountConversion,
  type AdxAccountConversionFormValues,
  type AdxGame,
  type AdxGameFormValues,
  type AdxLink,
  type AdxLinkFormValues,
} from '@/features/adx/types'
import { formatApiError } from '@/features/settings/components'

type DialogBaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const GAME_DEFAULT_VALUES: AdxGameFormValues = {
  name: '',
  slug: null,
  thumbnail: null,
  description: null,
  game_url: null,
  status: 'active',
  sort_order: 0,
}

const ACCOUNT_DEFAULT_VALUES: AdxAccountFormValues = {
  source: 'google',
  account_id: '',
  account_name: null,
  status: 'ACTIVE',
  is_special: false,
  sync_to_mcc: false,
}

export function AdxAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  account,
}: DialogBaseProps & { account: AdxAccount | null }) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = Boolean(account)

  const form = useForm<AdxAccountFormValues>({
    resolver: zodResolver(adxAccountSchema) as Resolver<AdxAccountFormValues>,
    defaultValues: ACCOUNT_DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    form.reset(
      account
        ? {
            source: account.source,
            account_id: account.account_id,
            account_name: account.account_name,
            status: account.status,
            is_special: account.is_special,
            sync_to_mcc: account.sync_to_mcc,
          }
        : ACCOUNT_DEFAULT_VALUES,
    )
  }, [open, account, form])

  const onSubmit = async (values: AdxAccountFormValues) => {
    try {
      setSubmitting(true)
      setFormError(null)
      if (account) {
        await adxApi.updateAccount(account.id, values)
        toast.success('AdX account updated successfully')
      } else {
        await adxApi.createAccount(values)
        toast.success('AdX account created successfully')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit AdX Account' : 'Create AdX Account'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select
                      disabled={submitting}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      disabled={submitting}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACCOUNT_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account ID</FormLabel>
                    <FormControl>
                      <Input disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={submitting}
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="is_special"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        disabled={submitting}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                    </FormControl>
                    <FormLabel className="m-0">Fetch enabled</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sync_to_mcc"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        disabled={submitting}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                    </FormControl>
                    <FormLabel className="m-0">Sync to MCC</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <FormError message={formError} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function AdxGameDialog({
  open,
  onOpenChange,
  onSuccess,
  game,
}: DialogBaseProps & { game: AdxGame | null }) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = Boolean(game)

  const form = useForm<AdxGameFormValues>({
    resolver: zodResolver(adxGameSchema) as Resolver<AdxGameFormValues>,
    defaultValues: GAME_DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    form.reset(
      game
        ? {
            name: game.name,
            slug: game.slug,
            thumbnail: game.thumbnail,
            description: game.description,
            game_url: game.game_url,
            status: game.status,
            sort_order: game.sort_order,
          }
        : GAME_DEFAULT_VALUES,
    )
  }, [open, game, form])

  const onSubmit = async (values: AdxGameFormValues) => {
    try {
      setSubmitting(true)
      setFormError(null)
      if (game) {
        await adxApi.updateGame(game.id, values)
        toast.success('AdX game updated successfully')
      } else {
        await adxApi.createGame(values)
        toast.success('AdX game created successfully')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit AdX Game' : 'Create AdX Game'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        disabled={submitting}
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      disabled={submitting}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="thumbnail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail</FormLabel>
                  <FormControl>
                    <Input
                      disabled={submitting}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="game_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game URL</FormLabel>
                  <FormControl>
                    <Input
                      disabled={submitting}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={submitting}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError message={formError} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const LINK_DEFAULT_VALUES: AdxLinkFormValues = {
  adx_game_id: 0,
  name: '',
  landing_url: '',
  status: 'active',
}

export function AdxLinkDialog({
  open,
  onOpenChange,
  onSuccess,
  link,
  games,
}: DialogBaseProps & { link: AdxLink | null; games: AdxGame[] }) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = Boolean(link)
  const gameOptions = useMemo(
    () => games.map((game) => ({ label: game.name, value: String(game.id) })),
    [games],
  )

  const form = useForm<AdxLinkFormValues>({
    resolver: zodResolver(adxLinkSchema) as Resolver<AdxLinkFormValues>,
    defaultValues: LINK_DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    form.reset(
      link
        ? {
            adx_game_id: link.adx_game_id,
            name: link.name,
            landing_url: link.landing_url,
            status: link.status,
          }
        : {
            ...LINK_DEFAULT_VALUES,
            adx_game_id: games[0]?.id ?? 0,
            landing_url: games[0]?.game_url ?? '',
          },
    )
  }, [open, link, games, form])

  const onSubmit = async (values: AdxLinkFormValues) => {
    try {
      setSubmitting(true)
      setFormError(null)
      if (link) {
        await adxApi.updateLink(link.id, values)
        toast.success('AdX link updated successfully')
      } else {
        await adxApi.createLink(values)
        toast.success('AdX link created successfully')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit AdX Link' : 'Create AdX Link'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="adx_game_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game</FormLabel>
                    <Select
                      disabled={submitting || gameOptions.length === 0}
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => {
                        const gameId = Number(value)
                        field.onChange(gameId)
                        const selectedGame = games.find((game) => game.id === gameId)
                        if (selectedGame?.game_url && (!isEdit || !form.getValues('landing_url'))) {
                          form.setValue('landing_url', selectedGame.game_url)
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select game" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gameOptions.map((game) => (
                          <SelectItem key={game.value} value={game.value}>
                            {game.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="landing_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landing URL</FormLabel>
                  <FormControl>
                    <Textarea disabled={submitting} {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select disabled={submitting} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError message={formError} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const ACCOUNT_CONVERSION_DEFAULT_VALUES: AdxAccountConversionFormValues = {
  source: 'google',
  account_id: '',
  conversion_type: 'landing_view',
  conversion_action_id: '',
  name: null,
  status: 'active',
}

export function AdxAccountConversionDialog({
  open,
  onOpenChange,
  onSuccess,
  conversion,
}: DialogBaseProps & { conversion: AdxAccountConversion | null }) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = Boolean(conversion)

  const form = useForm<AdxAccountConversionFormValues>({
    resolver: zodResolver(adxAccountConversionSchema) as Resolver<AdxAccountConversionFormValues>,
    defaultValues: ACCOUNT_CONVERSION_DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    form.reset(
      conversion
        ? {
            source: conversion.source,
            account_id: conversion.account_id,
            conversion_type: conversion.conversion_type,
            conversion_action_id: conversion.conversion_action_id,
            name: conversion.name,
            status: conversion.status,
          }
        : ACCOUNT_CONVERSION_DEFAULT_VALUES,
    )
  }, [open, conversion, form])

  const onSubmit = async (values: AdxAccountConversionFormValues) => {
    try {
      setSubmitting(true)
      setFormError(null)
      if (conversion) {
        await adxApi.updateAccountConversion(conversion.id, {
          conversion_action_id: values.conversion_action_id,
          name: values.name,
          status: values.status,
        })
        toast.success('Conversion mapping updated successfully')
      } else {
        await adxApi.createAccountConversion(values)
        toast.success('Conversion mapping created successfully')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Account Conversion' : 'Create Account Conversion'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select
                      disabled={submitting || isEdit}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account ID</FormLabel>
                    <FormControl>
                      <Input disabled={submitting || isEdit} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="conversion_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conversion Type</FormLabel>
                  <Select
                    disabled={submitting || isEdit}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONVERSION_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replaceAll('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conversion_action_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conversion Action ID</FormLabel>
                  <FormControl>
                    <Input disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={submitting}
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      disabled={submitting}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormError message={formError} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function AdxDeleteDialog({
  open,
  title,
  description,
  deleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: ReactNode
  deleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={onConfirm}>
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="size-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}
