<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class MetricoolReportsReady extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $period,
        public readonly string $downloadUrl,
        public readonly int    $reportCount,
        public readonly string $storagePath, // relative path inside public disk
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Reportes Metricool {$this->period} listos ({$this->reportCount} clientes)",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.metricool-reports-ready',
        );
    }

    public function attachments(): array
    {
        $fullPath = Storage::disk('public')->path($this->storagePath);

        return [
            Attachment::fromPath($fullPath)
                ->as("reportes-metricool-{$this->period}.zip")
                ->withMime('application/zip'),
        ];
    }
}
