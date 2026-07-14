<?php

namespace App\Services;

use Google\Client;
use Google\Http\MediaFileUpload;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Google\Service\Drive\Permission;

class GoogleDriveService
{
    private Client $client;
    private Drive $drive;

    public function __construct()
    {
        $this->client = new Client();
        $this->client->setAuthConfig(base_path(config('services.google_drive.service_account_path')));
        $this->client->addScope(Drive::DRIVE);

        $this->drive = new Drive($this->client);
    }

    public function uploadVideo(string $filePath, string $fileName, string $clientName, string $pieceName): string
    {
        $rootFolderId   = config('services.google_drive.root_folder_id');
        $clientFolderId = $this->getOrCreateFolder($clientName, $rootFolderId);
        $stagingId      = $this->getOrCreateFolder('En revisión', $clientFolderId);
        $pieceFolderId  = $this->getOrCreateFolder($pieceName, $stagingId);

        $mimeType = mime_content_type($filePath) ?: 'video/mp4';
        $fileSize = filesize($filePath);

        $fileMetadata = new DriveFile([
            'name'    => $fileName,
            'parents' => [$pieceFolderId],
        ]);

        // Resumable upload — handles large files without memory issues
        $this->client->setDefer(true);
        $request = $this->drive->files->create($fileMetadata, [
            'fields'           => 'id,webViewLink',
            'supportsAllDrives' => true,
        ]);

        $chunkSize = 10 * 1024 * 1024; // 10MB chunks
        $media     = new MediaFileUpload($this->client, $request, $mimeType, null, true, $chunkSize);
        $media->setFileSize($fileSize);

        $status = false;
        $handle = fopen($filePath, 'rb');
        while (!$status && !feof($handle)) {
            $chunk  = fread($handle, $chunkSize);
            $status = $media->nextChunk($chunk);
        }
        fclose($handle);

        $this->client->setDefer(false);

        $fileId = $status->getId();

        $this->drive->permissions->create($fileId, new Permission([
            'type' => 'anyone',
            'role' => 'reader',
        ]), ['supportsAllDrives' => true]);

        return "https://drive.google.com/file/d/{$fileId}/view";
    }

    public function moveVideoToDelivery(string $videoLink, string $clientName, string $pieceName): void
    {
        preg_match('/\/d\/([a-zA-Z0-9_-]+)/', $videoLink, $matches);
        $fileId = $matches[1] ?? null;

        if (!$fileId) {
            return;
        }

        $rootFolderId   = config('services.google_drive.root_folder_id');
        $clientFolderId = $this->getOrCreateFolder($clientName, $rootFolderId);
        $deliveryId     = $this->getOrCreateFolder('A entregar', $clientFolderId);
        $pieceFolderId  = $this->getOrCreateFolder($pieceName, $deliveryId);

        // Get current parents to remove them
        $file = $this->drive->files->get($fileId, [
            'fields'            => 'parents',
            'supportsAllDrives' => true,
        ]);

        $previousParents = implode(',', $file->getParents() ?? []);

        $this->drive->files->update($fileId, new DriveFile(), [
            'addParents'        => $pieceFolderId,
            'removeParents'     => $previousParents,
            'supportsAllDrives' => true,
            'fields'            => 'id',
        ]);
    }

    public function streamFile(string $fileId): \GuzzleHttp\Psr7\Response
    {
        $this->client->setDefer(false);
        return $this->drive->files->get($fileId, [
            'alt'               => 'media',
            'supportsAllDrives' => true,
        ]);
    }

    public function getFileMetadata(string $fileId): DriveFile
    {
        return $this->drive->files->get($fileId, [
            'fields'            => 'id,name,mimeType,size',
            'supportsAllDrives' => true,
        ]);
    }

    private function getOrCreateFolder(string $name, string $parentId): string
    {
        $escaped = str_replace("'", "\\'", $name);
        $results = $this->drive->files->listFiles([
            'q'                     => "name = '{$escaped}' and '{$parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            'fields'                => 'files(id)',
            'includeItemsFromAllDrives' => true,
            'supportsAllDrives'     => true,
        ]);

        if (!empty($results->getFiles())) {
            return $results->getFiles()[0]->getId();
        }

        $folder = $this->drive->files->create(new DriveFile([
            'name'     => $name,
            'mimeType' => 'application/vnd.google-apps.folder',
            'parents'  => [$parentId],
        ]), ['fields' => 'id', 'supportsAllDrives' => true]);

        return $folder->getId();
    }
}
