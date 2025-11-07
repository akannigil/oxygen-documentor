'use client'

import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TemplateField } from '@/shared/types'
import type Konva from 'konva'
import useImage from 'use-image'

export interface TemplateEditorProps {
  templateUrl: string
  templateWidth?: number
  templateHeight?: number
  fields: TemplateField[]
  onFieldsChange: (fields: TemplateField[]) => void
}

// Constantes pour l'éditeur
const STAGE_WIDTH = 800
const STAGE_HEIGHT = 600
const MIN_SCALE = 0.5
const MAX_SCALE = 3
const SCALE_BY = 0.1
const MIN_FIELD_SIZE = 10
const DEFAULT_FONT_SIZE = 12
const ZOOM_SPEED = 0.95
const ZOOM_SPEED_IN = 1.05

interface Position {
  x: number
  y: number
}

interface RectSize extends Position {
  w: number
  h: number
}

export function TemplateEditor({
  templateUrl,
  templateWidth,
  templateHeight,
  fields: initialFields,
  onFieldsChange,
}: TemplateEditorProps) {
  const [image, imageStatus] = useImage(templateUrl)
  const [fields, setFields] = useState<TemplateField[]>(initialFields)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<Position | null>(null)
  const [currentRect, setCurrentRect] = useState<RectSize | null>(null)
  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState<Position>({ x: 0, y: 0 })
  const transformerRef = useRef<Konva.Transformer>(null)
  const stageRef = useRef<Konva.Stage>(null)

  const imgWidth = templateWidth || image?.width || STAGE_WIDTH
  const imgHeight = templateHeight || image?.height || STAGE_HEIGHT

  useEffect(() => {
    setFields(initialFields)
  }, [initialFields])

  useEffect(() => {
    if (selectedFieldId && transformerRef.current) {
      const stage = transformerRef.current.getStage()
      const selectedNode = stage?.findOne(`.${selectedFieldId}`)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer()?.batchDraw()
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedFieldId])

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    // Si on clique sur un élément existant (zone de champ), ne pas créer de nouvelle zone
    const targetType = e.target.getType()
    const clickedOnField = targetType === 'Rect' && e.target.name()?.startsWith('field-')

    // Permettre le dessin si on clique sur le Stage ou sur l'Image, mais pas sur une zone existante
    if (!clickedOnField) {
      setSelectedFieldId(null)
      setIsDrawing(true)
      const stage = e.target.getStage()
      const pos = stage?.getPointerPosition()
      if (pos) {
        setDrawStart({ x: pos.x, y: pos.y })
      }
    }
  }

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawStart) return

    const pos = e.target.getStage()?.getPointerPosition()
    if (pos) {
      const x = Math.min(drawStart.x, pos.x)
      const y = Math.min(drawStart.y, pos.y)
      const w = Math.abs(pos.x - drawStart.x)
      const h = Math.abs(pos.y - drawStart.y)
      setCurrentRect({ x, y, w, h })
    }
  }

  const handleStageMouseUp = () => {
    if (!isDrawing || !drawStart || !currentRect) {
      setIsDrawing(false)
      setDrawStart(null)
      setCurrentRect(null)
      return
    }

    // Créer une nouvelle zone seulement si elle a une taille minimale
    if (currentRect.w > MIN_FIELD_SIZE && currentRect.h > MIN_FIELD_SIZE) {
      const newField: TemplateField = {
        key: `field_${Date.now()}`,
        x: currentRect.x / scale,
        y: currentRect.y / scale,
        w: currentRect.w / scale,
        h: currentRect.h / scale,
        type: 'text',
        fontSize: DEFAULT_FONT_SIZE,
        align: 'left',
      }

      const updatedFields = [...fields, newField]
      setFields(updatedFields)
      onFieldsChange(updatedFields)
    }

    setIsDrawing(false)
    setDrawStart(null)
    setCurrentRect(null)
  }

  const handleFieldClick = (field: TemplateField, index: number) => {
    setSelectedFieldId(`field-${index}`)
  }

  const handleFieldDragEnd = (
    field: TemplateField,
    index: number,
    e: KonvaEventObject<DragEvent>
  ) => {
    const node = e.target
    const newX = node.x() / scale
    const newY = node.y() / scale

    const updatedFields = fields.map((f, i) => (i === index ? { ...f, x: newX, y: newY } : f))
    setFields(updatedFields)
    onFieldsChange(updatedFields)
  }

  const handleFieldTransformEnd = (
    field: TemplateField,
    index: number,
    e: KonvaEventObject<Event>
  ) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    node.scaleX(1)
    node.scaleY(1)

    const newWidth = Math.max(5, node.width() * scaleX)
    const newHeight = Math.max(5, node.height() * scaleY)

    const updatedFields = fields.map((f, i) =>
      i === index
        ? {
            ...f,
            x: node.x() / scale,
            y: node.y() / scale,
            w: newWidth / scale,
            h: newHeight / scale,
          }
        : f
    )
    setFields(updatedFields)
    onFieldsChange(updatedFields)
  }

  const handleDeleteField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index)
    setFields(updatedFields)
    onFieldsChange(updatedFields)
    setSelectedFieldId(null)
  }

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    const stage = e.target.getStage()
    if (!stage) return

    const oldScale = scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo: Position = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }

    const newScale = e.evt.deltaY > 0 ? oldScale * ZOOM_SPEED : oldScale * ZOOM_SPEED_IN
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))

    setScale(clampedScale)
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }

  if (imageStatus === 'loading') {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">Chargement du template...</p>
      </div>
    )
  }

  if (imageStatus === 'failed') {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-red-200 bg-red-50">
        <p className="text-sm text-red-800">Erreur lors du chargement du template</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(Math.max(MIN_SCALE, scale - SCALE_BY))}
            className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
            aria-label="Zoom arrière"
          >
            -
          </button>
          <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(Math.min(MAX_SCALE, scale + SCALE_BY))}
            className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
            aria-label="Zoom avant"
          >
            +
          </button>
          <button
            onClick={() => {
              setScale(1)
              setStagePos({ x: 0, y: 0 })
            }}
            className="ml-4 rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            Reset
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {fields.length} zone{fields.length !== 1 ? 's' : ''} définie
          {fields.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Canvas */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <Stage
          ref={stageRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onWheel={handleWheel}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
        >
          <Layer>
            {/* Image de fond */}
            {image && <KonvaImage image={image} width={imgWidth} height={imgHeight} x={0} y={0} />}

            {/* Rectangles de dessin en cours */}
            {isDrawing && currentRect && (
              <Rect
                x={currentRect.x}
                y={currentRect.y}
                width={currentRect.w}
                height={currentRect.h}
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[5, 5]}
                fill="rgba(59, 130, 246, 0.1)"
              />
            )}

            {/* Zones définies */}
            {fields.map((field, index) => {
              const isSelected = selectedFieldId === `field-${index}`
              return (
                <Rect
                  key={`field-${index}`}
                  name={`field-${index}`}
                  x={field.x * scale}
                  y={field.y * scale}
                  width={field.w * scale}
                  height={field.h * scale}
                  stroke={isSelected ? '#3b82f6' : '#6b7280'}
                  strokeWidth={isSelected ? 3 : 1}
                  fill="rgba(59, 130, 246, 0.1)"
                  draggable
                  onClick={() => handleFieldClick(field, index)}
                  onDragEnd={(e) => handleFieldDragEnd(field, index, e)}
                  onTransformEnd={(e) => handleFieldTransformEnd(field, index, e)}
                />
              )
            })}

            {/* Transformer pour redimensionnement */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limiter la taille minimale
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox
                }
                return newBox
              }}
            />
          </Layer>
        </Stage>
      </div>

      {/* Liste des zones avec actions */}
      {selectedFieldId && (
        <FieldPropertiesPanel
          field={fields.find((_, i) => `field-${i}` === selectedFieldId)!}
          index={Number.parseInt(selectedFieldId.split('-')[1]!)}
          onUpdate={(updatedField) => {
            const updatedFields = fields.map((f, i) =>
              i === updatedField.index ? updatedField.field : f
            )
            setFields(updatedFields)
            onFieldsChange(updatedFields)
          }}
          onDelete={handleDeleteField}
        />
      )}
    </div>
  )
}

interface FieldPropertiesPanelProps {
  field: TemplateField
  index: number
  onUpdate: (field: { field: TemplateField; index: number }) => void
  onDelete: (index: number) => void
}

function FieldPropertiesPanel({ field, index, onUpdate, onDelete }: FieldPropertiesPanelProps) {
  const [localField, setLocalField] = useState(field)

  useEffect(() => {
    setLocalField(field)
  }, [field])

  const handleChange = (key: keyof TemplateField, value: unknown) => {
    const updated = { ...localField, [key]: value }
    setLocalField(updated)
    onUpdate({ field: updated, index })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Propriétés de la zone</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Clé</label>
          <input
            type="text"
            value={localField.key}
            onChange={(e) => handleChange('key', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Type</label>
          <select
            value={localField.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="text">Texte</option>
            <option value="qrcode">QR Code</option>
            <option value="date">Date</option>
            <option value="number">Nombre</option>
          </select>
        </div>
        {(localField.type === 'text' ||
          localField.type === 'number' ||
          localField.type === 'date') && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700">Taille de police</label>
              <input
                type="number"
                value={localField.fontSize || 12}
                onChange={(e) => handleChange('fontSize', Number.parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                min={8}
                max={72}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Police</label>
              <select
                value={localField.fontFamily || 'Helvetica'}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="Helvetica">Helvetica</option>
                <option value="Helvetica-Bold">Helvetica Bold</option>
                <option value="Times-Roman">Times Roman</option>
                <option value="Times-Bold">Times Bold</option>
                <option value="Courier">Courier</option>
                <option value="Courier-Bold">Courier Bold</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Alignement</label>
              <select
                value={localField.align || 'left'}
                onChange={(e) => handleChange('align', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Couleur du texte</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={localField.textColor || '#000000'}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="h-8 w-16 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={localField.textColor || '#000000'}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Couleur de fond</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={localField.backgroundColor || '#ffffff'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="h-8 w-16 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={localField.backgroundColor || ''}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  placeholder="Transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Bordure</label>
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localField.borderColor || '#000000'}
                    onChange={(e) => handleChange('borderColor', e.target.value)}
                    className="h-8 w-16 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={localField.borderColor || ''}
                    onChange={(e) => handleChange('borderColor', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Couleur bordure"
                  />
                </div>
                <input
                  type="number"
                  value={localField.borderWidth || 0}
                  onChange={(e) => handleChange('borderWidth', Number.parseInt(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  placeholder="Épaisseur (px)"
                  min={0}
                  max={10}
                />
              </div>
            </div>
          </>
        )}
        {localField.type === 'text' && (
          <div>
            <label className="block text-xs font-medium text-gray-700">Format du texte</label>
            <select
              value={localField.format || ''}
              onChange={(e) => handleChange('format', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">Aucun</option>
              <option value="uppercase">MAJUSCULES</option>
              <option value="lowercase">minuscules</option>
              <option value="capitalize">Première Majuscule</option>
            </select>
          </div>
        )}
        {localField.type === 'date' && (
          <div>
            <label className="block text-xs font-medium text-gray-700">Format de date</label>
            <select
              value={localField.format || ''}
              onChange={(e) => handleChange('format', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">DD/MM/YYYY (défaut)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </div>
        )}
        {localField.type === 'number' && (
          <div>
            <label className="block text-xs font-medium text-gray-700">Format de nombre</label>
            <select
              value={localField.format || ''}
              onChange={(e) => handleChange('format', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">Entier</option>
              <option value="0.0">1 décimale</option>
              <option value="0.00">2 décimales</option>
              <option value="0.000">3 décimales</option>
            </select>
          </div>
        )}
        <button
          onClick={() => onDelete(index)}
          className="mt-4 w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          Supprimer la zone
        </button>
      </div>
    </div>
  )
}
