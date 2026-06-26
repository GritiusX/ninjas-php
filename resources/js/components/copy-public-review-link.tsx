import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function publicReviewUrl(token: string): string {
    return `${window.location.origin}/review/${token}`;
}

type Props = {
    token: string | null | undefined;
    variant?: 'button' | 'icon';
};

export function CopyPublicReviewLink({ token, variant = 'icon' }: Props) {
    const [copied, setCopied] = useState(false);

    if (!token) return null;

    async function copy() {
        await navigator.clipboard.writeText(publicReviewUrl(token!));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (variant === 'button') {
        return (
            <Button variant="outline" onClick={copy} className="gap-2">
                <Link2 className="h-4 w-4" />
                {copied ? 'Copiado!' : 'Copiar link público'}
            </Button>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={copy}
                >
                    <Link2 className="h-3.5 w-3.5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? 'Copiado!' : 'Copiar link público'}</TooltipContent>
        </Tooltip>
    );
}
