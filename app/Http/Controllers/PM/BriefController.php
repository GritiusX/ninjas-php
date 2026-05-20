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
            'client_id'     => ['required', 'exists:clients,id'],
            'concept'       => ['required', 'string', 'max:1000'],
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
            'deadline'              => ['required', 'date'],
            'raw_material_link'     => ['nullable', 'url', 'max:500'],
            'raw_material_links'    => ['nullable', 'array', 'max:10'],
            'raw_material_links.*'  => ['url', 'max:500'],
            'editor_id'             => ['nullable', 'exists:users,id'],
        ]);

        $status = ContentPiece::STATUS_BRIEF;
        $editorId = null;

        if (! empty($data['editor_id'])) {
            $editorId = $data['editor_id'];
            $status = ContentPiece::STATUS_EDITING;
        }

        unset($data['editor_id']);

        ContentPiece::create([
            ...$data,
            'assigned_editor_id' => $editorId,
            'status' => $status,
        ]);

        return redirect()->route('pm.dashboard')->with('success', 'Brief creado correctamente.');
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
