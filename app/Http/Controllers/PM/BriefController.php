<?php

namespace App\Http\Controllers\PM;

use App\Http\Controllers\Controller;
use App\Models\ContentPiece;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BriefController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'client_id'            => ['required', 'exists:clients,id'],
            'development'          => ['required', 'string', 'max:1000'],
            'brief_notes'          => ['nullable', 'string'],
            'deadline'             => ['nullable', 'date'],
            'raw_material_links'   => ['required', 'array', 'min:1', 'max:10'],
            'raw_material_links.*' => ['required', 'url', 'max:500'],
            'assigned_editor_id'   => ['nullable', 'exists:users,id'],
        ]);

        ContentPiece::create([
            'client_id'          => $data['client_id'],
            'development'        => $data['development'],
            'brief_notes'        => $data['brief_notes'] ?? null,
            'deadline'           => $data['deadline'] ?? null,
            'raw_material_links' => $data['raw_material_links'],
            'assigned_editor_id' => $data['assigned_editor_id'] ?? null,
            'priority'           => ContentPiece::PRIORITY_MEDIUM,
            'status'             => ContentPiece::STATUS_BRIEF,
        ]);

        return redirect()->route('pm.dashboard')->with('success', 'Brief creado correctamente.');
    }

    public function bulkStore(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'rows'                         => ['required', 'array', 'min:1', 'max:50'],
            'rows.*.client_id'             => ['required', 'exists:clients,id'],
            'rows.*.concept'               => ['required', 'string', 'max:1000'],
            'rows.*.development'           => ['nullable', 'string'],
            'rows.*.brief_notes'           => ['nullable', 'string'],
            'rows.*.deadline'              => ['nullable', 'date'],
            'rows.*.raw_material_links'    => ['required', 'array', 'min:1', 'max:10'],
            'rows.*.raw_material_links.*'  => ['required', 'url', 'max:500'],
            'rows.*.assigned_editor_id'    => ['nullable', 'exists:users,id'],
        ]);

        foreach ($data['rows'] as $row) {
            $editorId = $row['assigned_editor_id'] ?? null;
            ContentPiece::create([
                'client_id'          => $row['client_id'],
                'concept'            => $row['concept'],
                'development'        => $row['development'] ?? null,
                'brief_notes'        => $row['brief_notes'] ?? null,
                'deadline'           => $row['deadline'] ?? null,
                'raw_material_links' => $row['raw_material_links'],
                'priority'           => ContentPiece::PRIORITY_MEDIUM,
                'status'             => $editorId ? ContentPiece::STATUS_EDITING : ContentPiece::STATUS_BRIEF,
                'assigned_editor_id' => $editorId,
            ]);
        }

        $count = count($data['rows']);

        return redirect()->route('pm.dashboard')->with('success', "{$count} brief(s) creados correctamente.");
    }

    public function update(Request $request, ContentPiece $piece): RedirectResponse
    {
        $data = $request->validate([
            'concept'       => ['nullable', 'string', 'max:1000'],
            'product'       => ['nullable', 'string', 'max:500'],
            'category'      => ['nullable', 'string', 'max:80'],
            'objective'     => ['nullable', 'string'],
            'hook'          => ['nullable', 'string'],
            'development'   => ['nullable', 'string'],
            'cta'           => ['nullable', 'string', 'max:255'],
            'brief_notes'   => ['nullable', 'string'],
            'client_status' => ['nullable', 'string', 'max:120'],
            'is_scheduled'          => ['boolean'],
            'priority'              => ['required', 'integer', 'in:1,2,3'],
            'deadline'              => ['nullable', 'date'],
            'raw_material_link'     => ['nullable', 'url', 'max:500'],
            'raw_material_links'    => ['nullable', 'array', 'max:10'],
            'raw_material_links.*'  => ['url', 'max:500'],
        ]);

        $piece->update($data);

        return back()->with('success', 'Brief actualizado.');
    }

    public function destroy(ContentPiece $piece): RedirectResponse
    {
        $piece->delete();

        return redirect()->route('pm.dashboard')->with('success', 'Pieza eliminada.');
    }

    public function assign(Request $request, ContentPiece $piece): RedirectResponse
    {
        $request->validate([
            'editor_id' => ['required', 'exists:users,id'],
        ]);

        $editor = User::findOrFail($request->editor_id);

        $piece->update([
            'assigned_editor_id' => $editor->id,
            'status' => ContentPiece::STATUS_EDITING,
        ]);

        return back()->with('success', "Editor {$editor->name} asignado.");
    }
}
