import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
const buttonVariants=cva("inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",{variants:{variant:{default:'bg-primary text-primary-foreground',outline:'border border-border bg-background',secondary:'bg-secondary text-secondary-foreground',ghost:'hover:bg-muted',destructive:'bg-destructive/10 text-destructive',link:'text-primary underline-offset-4 hover:underline'},size:{default:'h-8 px-2.5',xs:'h-6 px-2 text-xs',sm:'h-7 px-2.5',lg:'h-9 px-3',icon:'size-8','icon-xs':'size-6','icon-sm':'size-7','icon-lg':'size-9'}},defaultVariants:{variant:'default',size:'default'}})
function Button({className,variant='default',size='default',...props}:ButtonPrimitive.Props&VariantProps<typeof buttonVariants>){return <ButtonPrimitive className={cn(buttonVariants({variant,size,className}))}{...props}/>}
export {Button,buttonVariants}
