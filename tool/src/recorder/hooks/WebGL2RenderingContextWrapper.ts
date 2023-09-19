import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { TYPED_ARRAY_UNWRAP_KEY } from '../inject/wrapTypedArray.js';
import { type WrappedTypedArray } from '../types/WrappedTypedArray.js';

export const RENDERING_CONTEXT_RECORDER_KEY = 'wle-trace-RenderingContext-recorder';
export const RENDERING_CONTEXT_UNWRAP_KEY = 'wle-trace-RenderingContext-unwrap';

function unwrapTypedArrays(wrapper: WebGL2RenderingContextWrapper, args: Array<any>, unwrapIdxs: Array<number>) {
    for (const idx of unwrapIdxs) {
        const val = args[idx];
        if (val && val.buffer && wrapper[RENDERING_CONTEXT_RECORDER_KEY].isHeapBuffer(val.buffer)) {
            const newVal = (val as unknown as WrappedTypedArray)[TYPED_ARRAY_UNWRAP_KEY];
            if (newVal) {
                args[idx] = newVal;
            }
        }
    }
}

export class WebGL2RenderingContextWrapper implements WebGL2RenderingContext {
    [RENDERING_CONTEXT_RECORDER_KEY]: WLETraceRecorder;
    [RENDERING_CONTEXT_UNWRAP_KEY]: WebGL2RenderingContext;

    constructor(recorder: WLETraceRecorder, context: WebGL2RenderingContext) {
        this[RENDERING_CONTEXT_RECORDER_KEY] = recorder;
        this[RENDERING_CONTEXT_UNWRAP_KEY] = context;
    }

    /** WebGL2RenderingContextBase methods */
    beginQuery(target: GLenum, query: WebGLQuery): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].beginQuery(target, query);
    }

    beginTransformFeedback(primitiveMode: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].beginTransformFeedback(primitiveMode);
    }

    bindBufferBase(target: GLenum, index: GLuint, buffer: WebGLBuffer | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindBufferBase(target, index, buffer);
    }

    bindBufferRange(target: GLenum, index: GLuint, buffer: WebGLBuffer | null, offset: GLintptr, size: GLsizeiptr): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindBufferRange(target, index, buffer, offset, size);
    }

    bindSampler(unit: GLuint, sampler: WebGLSampler | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindSampler(unit, sampler);
    }

    bindTransformFeedback(target: GLenum, tf: WebGLTransformFeedback | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindTransformFeedback(target, tf);
    }

    bindVertexArray(array: WebGLVertexArrayObject | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindVertexArray(array);
    }

    blitFramebuffer(srcX0: GLint, srcY0: GLint, srcX1: GLint, srcY1: GLint, dstX0: GLint, dstY0: GLint, dstX1: GLint, dstY1: GLint, mask: GLbitfield, filter: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].blitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter);
    }

    clearBufferfi(buffer: GLenum, drawbuffer: GLint, depth: GLfloat, stencil: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clearBufferfi(buffer, drawbuffer, depth, stencil);
    }

    clearBufferfv(buffer: GLenum, drawbuffer: GLint, values: Float32List, srcOffset?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clearBufferfv(buffer, drawbuffer, values, srcOffset);
    }

    clearBufferiv(buffer: GLenum, drawbuffer: GLint, values: Int32List, srcOffset?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clearBufferiv(buffer, drawbuffer, values, srcOffset);
    }

    clearBufferuiv(buffer: GLenum, drawbuffer: GLint, values: Uint32List, srcOffset?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clearBufferuiv(buffer, drawbuffer, values, srcOffset);
    }

    clientWaitSync(sync: WebGLSync, flags: GLbitfield, timeout: GLuint64): GLenum {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clientWaitSync(sync, flags, timeout);
    }

    compressedTexImage3D(target: GLenum, level: GLint, internalformat: GLenum, width: GLsizei, height: GLsizei, depth: GLsizei, border: GLint, imageSize: GLsizei, offset: GLintptr): void;
    compressedTexImage3D(target: GLenum, level: GLint, internalformat: GLenum, width: GLsizei, height: GLsizei, depth: GLsizei, border: GLint, srcData: ArrayBufferView, srcOffset?: GLuint, srcLengthOverride?: GLuint): void;
    compressedTexImage3D(...args: unknown[]) {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].compressedTexImage3D as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    compressedTexSubImage3D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, zoffset: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, format: GLenum, imageSize: GLsizei, offset: GLintptr): void;
    compressedTexSubImage3D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, zoffset: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, format: GLenum, srcData: ArrayBufferView, srcOffset?: GLuint, srcLengthOverride?: GLuint): void;
    compressedTexSubImage3D(...args: unknown[]): void {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].compressedTexSubImage3D as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    copyBufferSubData(readTarget: GLenum, writeTarget: GLenum, readOffset: GLintptr, writeOffset: GLintptr, size: GLsizeiptr): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].copyBufferSubData(readTarget, writeTarget, readOffset, writeOffset, size);
    }

    copyTexSubImage3D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, zoffset: GLint, x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].copyTexSubImage3D(target, level, xoffset, yoffset, zoffset, x, y, width, height);
    }

    createQuery(): WebGLQuery | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createQuery();
    }

    createSampler(): WebGLSampler | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createSampler();
    }

    createTransformFeedback(): WebGLTransformFeedback | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createTransformFeedback();
    }

    createVertexArray(): WebGLVertexArrayObject | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createVertexArray();
    }

    deleteQuery(query: WebGLQuery | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteQuery(query);
    }

    deleteSampler(sampler: WebGLSampler | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteSampler(sampler);
    }

    deleteSync(sync: WebGLSync | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteSync(sync);
    }

    deleteTransformFeedback(tf: WebGLTransformFeedback | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteTransformFeedback(tf);
    }

    deleteVertexArray(vertexArray: WebGLVertexArrayObject | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteVertexArray(vertexArray);
    }

    drawArraysInstanced(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawArraysInstanced(mode, first, count, instanceCount);
    }

    drawBuffers(buffers: GLenum[]): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawBuffers(buffers);
    }

    drawElementsInstanced(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr, instanceCount: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawElementsInstanced(mode, count, type, offset, instanceCount);
    }

    drawRangeElements(mode: GLenum, start: GLuint, end: GLuint, count: GLsizei, type: GLenum, offset: GLintptr): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawRangeElements(mode, start, end, count, type, offset);
    }

    endQuery(target: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].endQuery(target);
    }

    endTransformFeedback(): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].endTransformFeedback();
    }

    fenceSync(condition: GLenum, flags: GLbitfield): WebGLSync | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].fenceSync(condition, flags);
    }

    framebufferTextureLayer(target: GLenum, attachment: GLenum, texture: WebGLTexture | null, level: GLint, layer: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].framebufferTextureLayer(target, attachment, texture, level, layer);
    }

    getActiveUniformBlockName(program: WebGLProgram, uniformBlockIndex: GLuint): string | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getActiveUniformBlockName(program, uniformBlockIndex);
    }

    getActiveUniformBlockParameter(program: WebGLProgram, uniformBlockIndex: GLuint, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getActiveUniformBlockParameter(program, uniformBlockIndex, pname);
    }

    getActiveUniforms(program: WebGLProgram, uniformIndices: GLuint[], pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getActiveUniforms(program, uniformIndices, pname);
    }

    getBufferSubData(target: GLenum, srcByteOffset: GLintptr, dstBuffer: ArrayBufferView, dstOffset?: GLuint, length?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length);
    }

    getFragDataLocation(program: WebGLProgram, name: string): GLint {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getFragDataLocation(program, name);
    }

    getIndexedParameter(target: GLenum, index: GLuint): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getIndexedParameter(target, index);
    }

    getInternalformatParameter(target: GLenum, internalformat: GLenum, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getInternalformatParameter(target, internalformat, pname);
    }

    getQuery(target: GLenum, pname: GLenum): WebGLQuery | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getQuery(target, pname);
    }

    getQueryParameter(query: WebGLQuery, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getQueryParameter(query, pname);
    }

    getSamplerParameter(sampler: WebGLSampler, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getSamplerParameter(sampler, pname);
    }

    getSyncParameter(sync: WebGLSync, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getSyncParameter(sync, pname);
    }

    getTransformFeedbackVarying(program: WebGLProgram, index: GLuint): WebGLActiveInfo | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getTransformFeedbackVarying(program, index);
    }

    getUniformBlockIndex(program: WebGLProgram, uniformBlockName: string): GLuint {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getUniformBlockIndex(program, uniformBlockName);
    }

    getUniformIndices(program: WebGLProgram, uniformNames: string[]): GLuint[] | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getUniformIndices(program, uniformNames);
    }

    invalidateFramebuffer(target: GLenum, attachments: GLenum[]): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].invalidateFramebuffer(target, attachments);
    }

    invalidateSubFramebuffer(target: GLenum, attachments: GLenum[], x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].invalidateSubFramebuffer(target, attachments, x, y, width, height);
    }

    isQuery(query: WebGLQuery | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isQuery(query);
    }

    isSampler(sampler: WebGLSampler | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isSampler(sampler);
    }

    isSync(sync: WebGLSync | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isSync(sync);
    }

    isTransformFeedback(tf: WebGLTransformFeedback | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isTransformFeedback(tf);
    }

    isVertexArray(vertexArray: WebGLVertexArrayObject | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isVertexArray(vertexArray);
    }

    pauseTransformFeedback(): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].pauseTransformFeedback();
    }

    readBuffer(src: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].readBuffer(src);
    }

    renderbufferStorageMultisample(target: GLenum, samples: GLsizei, internalformat: GLenum, width: GLsizei, height: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].renderbufferStorageMultisample(target, samples, internalformat, width, height);
    }

    resumeTransformFeedback(): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].resumeTransformFeedback();
    }

    samplerParameterf(sampler: WebGLSampler, pname: GLenum, param: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].samplerParameterf(sampler, pname, param);
    }

    samplerParameteri(sampler: WebGLSampler, pname: GLenum, param: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].samplerParameteri(sampler, pname, param);
    }

    texImage3D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, border: GLint, format: GLenum, type: GLenum, pboOffset: GLintptr): void;
    texImage3D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, border: GLint, format: GLenum, type: GLenum, source: TexImageSource): void;
    texImage3D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, border: GLint, format: GLenum, type: GLenum, srcData: ArrayBufferView | null): void;
    texImage3D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, border: GLint, format: GLenum, type: GLenum, srcData: ArrayBufferView, srcOffset: GLuint): void;
    texImage3D(...args: unknown[]): void {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].texImage3D as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    texStorage2D(target: GLenum, levels: GLsizei, internalformat: GLenum, width: GLsizei, height: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].texStorage2D(target, levels, internalformat, width, height);
    }

    texStorage3D(target: GLenum, levels: GLsizei, internalformat: GLenum, width: GLsizei, height: GLsizei, depth: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].texStorage3D(target, levels, internalformat, width, height, depth);
    }

    texSubImage3D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, zoffset: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, format: GLenum, type: GLenum, pboOffset: GLintptr): void;
    texSubImage3D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, zoffset: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, format: GLenum, type: GLenum, source: TexImageSource): void;
    texSubImage3D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, zoffset: GLint, width: GLsizei, height: GLsizei, depth: GLsizei, format: GLenum, type: GLenum, srcData: ArrayBufferView | null, srcOffset?: GLuint): void;
    texSubImage3D(...args: unknown[]): void {
        unwrapTypedArrays(this, args, [10]);
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].texSubImage3D as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    transformFeedbackVaryings(program: WebGLProgram, varyings: string[], bufferMode: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].transformFeedbackVaryings(program, varyings, bufferMode);
    }

    uniform1ui(location: WebGLUniformLocation | null, v0: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform1ui(location, v0);
    }

    uniform1uiv(location: WebGLUniformLocation | null, data: Uint32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform1uiv(location, data, srcOffset, srcLength);
    }

    uniform2ui(location: WebGLUniformLocation | null, v0: GLuint, v1: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform2ui(location, v0, v1);
    }

    uniform2uiv(location: WebGLUniformLocation | null, data: Uint32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform2uiv(location, data, srcOffset, srcLength);
    }

    uniform3ui(location: WebGLUniformLocation | null, v0: GLuint, v1: GLuint, v2: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform3ui(location, v0, v1, v2);
    }

    uniform3uiv(location: WebGLUniformLocation | null, data: Uint32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform3uiv(location, data, srcOffset, srcLength);
    }

    uniform4ui(location: WebGLUniformLocation | null, v0: GLuint, v1: GLuint, v2: GLuint, v3: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform4ui(location, v0, v1, v2, v3);
    }

    uniform4uiv(location: WebGLUniformLocation | null, data: Uint32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform4uiv(location, data, srcOffset, srcLength);
    }

    uniformBlockBinding(program: WebGLProgram, uniformBlockIndex: GLuint, uniformBlockBinding: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding);
    }

    uniformMatrix2x3fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix2x3fv(location, transpose, data, srcOffset, srcLength);
    }

    uniformMatrix2x4fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix2x4fv(location, transpose, data, srcOffset, srcLength);
    }

    uniformMatrix3x2fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix3x2fv(location, transpose, data, srcOffset, srcLength);
    }

    uniformMatrix3x4fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix3x4fv(location, transpose, data, srcOffset, srcLength);
    }

    uniformMatrix4x2fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix4x2fv(location, transpose, data, srcOffset, srcLength);
    }

    uniformMatrix4x3fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix4x3fv(location, transpose, data, srcOffset, srcLength);
    }

    vertexAttribDivisor(index: GLuint, divisor: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttribDivisor(index, divisor);
    }

    vertexAttribI4i(index: GLuint, x: GLint, y: GLint, z: GLint, w: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttribI4i(index, x, y, z, w);
    }

    vertexAttribI4iv(index: GLuint, values: Int32List): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttribI4iv(index, values);
    }

    vertexAttribI4ui(index: GLuint, x: GLuint, y: GLuint, z: GLuint, w: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttribI4ui(index, x, y, z, w);
    }

    vertexAttribI4uiv(index: GLuint, values: Uint32List): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttribI4uiv(index, values);
    }

    vertexAttribIPointer(index: GLuint, size: GLint, type: GLenum, stride: GLsizei, offset: GLintptr): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttribIPointer(index, size, type, stride, offset);
    }

    waitSync(sync: WebGLSync, flags: GLbitfield, timeout: GLint64): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].waitSync(sync, flags, timeout);
    }

    /** WebGL2RenderingContextOverloads methods */
    bufferData(target: GLenum, size: GLsizeiptr, usage: GLenum): void;
    bufferData(target: GLenum, srcData: BufferSource | null, usage: GLenum): void;
    bufferData(target: GLenum, srcData: ArrayBufferView, usage: GLenum, srcOffset: GLuint, length?: GLuint): void;
    bufferData(...args: unknown[]): void {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].bufferData as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    bufferSubData(target: GLenum, dstByteOffset: GLintptr, srcData: BufferSource): void;
    bufferSubData(target: GLenum, dstByteOffset: GLintptr, srcData: ArrayBufferView, srcOffset: GLuint, length?: GLuint): void;
    bufferSubData(...args: unknown[]): void {
        unwrapTypedArrays(this, args, [2]);
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].bufferSubData as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    compressedTexImage2D(target: GLenum, level: GLint, internalformat: GLenum, width: GLsizei, height: GLsizei, border: GLint, imageSize: GLsizei, offset: GLintptr): void;
    compressedTexImage2D(target: GLenum, level: GLint, internalformat: GLenum, width: GLsizei, height: GLsizei, border: GLint, srcData: ArrayBufferView, srcOffset?: GLuint, srcLengthOverride?: GLuint): void;
    compressedTexImage2D(...args: unknown[]): void {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].compressedTexImage2D as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    compressedTexSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, width: GLsizei, height: GLsizei, format: GLenum, imageSize: GLsizei, offset: GLintptr): void;
    compressedTexSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, width: GLsizei, height: GLsizei, format: GLenum, srcData: ArrayBufferView, srcOffset?: GLuint, srcLengthOverride?: GLuint): void;
    compressedTexSubImage2D(...args: unknown[]): void {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].compressedTexSubImage2D as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    readPixels(x: GLint, y: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, dstData: ArrayBufferView | null): void;
    readPixels(x: GLint, y: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, offset: GLintptr): void;
    readPixels(x: GLint, y: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, dstData: ArrayBufferView, dstOffset: GLuint): void;
    readPixels(...args: unknown[]): void {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].readPixels as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    texImage2D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, border: GLint, format: GLenum, type: GLenum, pixels: ArrayBufferView | null): void;
    texImage2D(target: GLenum, level: GLint, internalformat: GLint, format: GLenum, type: GLenum, source: TexImageSource): void;
    texImage2D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, border: GLint, format: GLenum, type: GLenum, pboOffset: GLintptr): void;
    texImage2D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, border: GLint, format: GLenum, type: GLenum, source: TexImageSource): void;
    texImage2D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, border: GLint, format: GLenum, type: GLenum, srcData: ArrayBufferView, srcOffset: GLuint): void;
    texImage2D(...args: unknown[]): void {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].texImage2D as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    texSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, pixels: ArrayBufferView | null): void;
    texSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, format: GLenum, type: GLenum, source: TexImageSource): void;
    texSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, pboOffset: GLintptr): void;
    texSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, source: TexImageSource): void;
    texSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, srcData: ArrayBufferView, srcOffset: GLuint): void;
    texSubImage2D(...args: unknown[]): void {
        unwrapTypedArrays(this, args, [8]);
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].texSubImage2D as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    uniform1fv(location: WebGLUniformLocation | null, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform1fv(location, data, srcOffset, srcLength);
    }

    uniform1iv(location: WebGLUniformLocation | null, data: Int32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform1iv(location, data, srcOffset, srcLength);
    }

    uniform2fv(location: WebGLUniformLocation | null, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform2fv(location, data, srcOffset, srcLength);
    }

    uniform2iv(location: WebGLUniformLocation | null, data: Int32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform2iv(location, data, srcOffset, srcLength);
    }

    uniform3fv(location: WebGLUniformLocation | null, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform3fv(location, data, srcOffset, srcLength);
    }

    uniform3iv(location: WebGLUniformLocation | null, data: Int32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform3iv(location, data, srcOffset, srcLength);
    }

    uniform4fv(location: WebGLUniformLocation | null, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform4fv.call(this[RENDERING_CONTEXT_UNWRAP_KEY], location, data, srcOffset, srcLength);
    }

    uniform4iv(location: WebGLUniformLocation | null, data: Int32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform4iv(location, data, srcOffset, srcLength);
    }

    uniformMatrix2fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix2fv(location, transpose, data, srcOffset, srcLength);
    }

    uniformMatrix3fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix3fv(location, transpose, data, srcOffset, srcLength);
    }

    uniformMatrix4fv(location: WebGLUniformLocation | null, transpose: GLboolean, data: Float32List, srcOffset?: GLuint, srcLength?: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniformMatrix4fv(location, transpose, data, srcOffset, srcLength);
    }

    /** WebGLRenderingContextBase methods */
    activeTexture(texture: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].activeTexture(texture);
    }

    attachShader(program: WebGLProgram, shader: WebGLShader): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].attachShader(program, shader);
    }

    bindAttribLocation(program: WebGLProgram, index: GLuint, name: string): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindAttribLocation(program, index, name);
    }

    bindBuffer(target: GLenum, buffer: WebGLBuffer | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindBuffer(target, buffer);
    }

    bindFramebuffer(target: GLenum, framebuffer: WebGLFramebuffer | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindFramebuffer(target, framebuffer);
    }

    bindRenderbuffer(target: GLenum, renderbuffer: WebGLRenderbuffer | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindRenderbuffer(target, renderbuffer);
    }

    bindTexture(target: GLenum, texture: WebGLTexture | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].bindTexture(target, texture);
    }

    blendColor(red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].blendColor(red, green, blue, alpha);
    }

    blendEquation(mode: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].blendEquation(mode);
    }

    blendEquationSeparate(modeRGB: GLenum, modeAlpha: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].blendEquationSeparate(modeRGB, modeAlpha);
    }

    blendFunc(sfactor: GLenum, dfactor: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].blendFunc(sfactor, dfactor);
    }

    blendFuncSeparate(srcRGB: GLenum, dstRGB: GLenum, srcAlpha: GLenum, dstAlpha: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha);
    }

    checkFramebufferStatus(target: GLenum): GLenum {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].checkFramebufferStatus(target);
    }

    clear(mask: GLbitfield): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clear(mask);
    }

    clearColor(red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clearColor(red, green, blue, alpha);
    }

    clearDepth(depth: GLclampf): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clearDepth(depth);
    }

    clearStencil(s: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].clearStencil(s);
    }

    colorMask(red: GLboolean, green: GLboolean, blue: GLboolean, alpha: GLboolean): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].colorMask(red, green, blue, alpha);
    }

    compileShader(shader: WebGLShader): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].compileShader(shader);
    }

    copyTexImage2D(target: GLenum, level: GLint, internalformat: GLenum, x: GLint, y: GLint, width: GLsizei, height: GLsizei, border: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].copyTexImage2D(target, level, internalformat, x, y, width, height, border);
    }

    copyTexSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].copyTexSubImage2D(target, level, xoffset, yoffset, x, y, width, height);
    }

    createBuffer(): WebGLBuffer | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createBuffer();
    }

    createFramebuffer(): WebGLFramebuffer | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createFramebuffer();
    }

    createProgram(): WebGLProgram | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createProgram();
    }

    createRenderbuffer(): WebGLRenderbuffer | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createRenderbuffer();
    }

    createShader(type: GLenum): WebGLShader | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createShader(type);
    }

    createTexture(): WebGLTexture | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].createTexture();
    }

    cullFace(mode: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].cullFace(mode);
    }

    deleteBuffer(buffer: WebGLBuffer | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteBuffer(buffer);
    }

    deleteFramebuffer(framebuffer: WebGLFramebuffer | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteFramebuffer(framebuffer);
    }

    deleteProgram(program: WebGLProgram | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteProgram(program);
    }

    deleteRenderbuffer(renderbuffer: WebGLRenderbuffer | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteRenderbuffer(renderbuffer);
    }

    deleteShader(shader: WebGLShader | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteShader(shader);
    }

    deleteTexture(texture: WebGLTexture | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].deleteTexture(texture);
    }

    depthFunc(func: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].depthFunc(func);
    }

    depthMask(flag: GLboolean): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].depthMask(flag);
    }

    depthRange(zNear: GLclampf, zFar: GLclampf): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].depthRange(zNear, zFar);
    }

    detachShader(program: WebGLProgram, shader: WebGLShader): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].detachShader(program, shader);
    }

    disable(cap: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].disable(cap);
    }

    disableVertexAttribArray(index: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].disableVertexAttribArray(index);
    }

    drawArrays(mode: GLenum, first: GLint, count: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawArrays(mode, first, count);
    }

    drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawElements(mode, count, type, offset);
    }

    enable(cap: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].enable(cap);
    }

    enableVertexAttribArray(index: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].enableVertexAttribArray(index);
    }

    finish(): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].finish();
    }

    flush(): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].flush();
    }

    framebufferRenderbuffer(target: GLenum, attachment: GLenum, renderbuffertarget: GLenum, renderbuffer: WebGLRenderbuffer | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].framebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer);
    }

    framebufferTexture2D(target: GLenum, attachment: GLenum, textarget: GLenum, texture: WebGLTexture | null, level: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].framebufferTexture2D(target, attachment, textarget, texture, level);
    }

    frontFace(mode: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].frontFace(mode);
    }

    generateMipmap(target: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].generateMipmap(target);
    }

    getActiveAttrib(program: WebGLProgram, index: GLuint): WebGLActiveInfo | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getActiveAttrib(program, index);
    }

    getActiveUniform(program: WebGLProgram, index: GLuint): WebGLActiveInfo | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getActiveUniform(program, index);
    }

    getAttachedShaders(program: WebGLProgram): WebGLShader[] | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getAttachedShaders(program);
    }

    getAttribLocation(program: WebGLProgram, name: string): GLint {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getAttribLocation(program, name);
    }

    getBufferParameter(target: GLenum, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getBufferParameter(target, pname);
    }

    getContextAttributes(): WebGLContextAttributes | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getContextAttributes();
    }

    getError(): GLenum {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getError();
    }

    getExtension(...args: [name: string]): any {
        return (this[RENDERING_CONTEXT_UNWRAP_KEY].getExtension as (...args: unknown[]) => void).apply(this[RENDERING_CONTEXT_UNWRAP_KEY], args);
    }

    getFramebufferAttachmentParameter(target: GLenum, attachment: GLenum, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getFramebufferAttachmentParameter(target, attachment, pname);
    }

    getParameter(pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getParameter(pname);
    }

    getProgramInfoLog(program: WebGLProgram): string | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getProgramInfoLog(program);
    }

    getProgramParameter(program: WebGLProgram, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getProgramParameter(program, pname);
    }

    getRenderbufferParameter(target: GLenum, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getRenderbufferParameter(target, pname);
    }

    getShaderInfoLog(shader: WebGLShader): string | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getShaderInfoLog(shader);
    }

    getShaderParameter(shader: WebGLShader, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getShaderParameter(shader, pname);
    }

    getShaderPrecisionFormat(shadertype: GLenum, precisiontype: GLenum): WebGLShaderPrecisionFormat | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getShaderPrecisionFormat(shadertype, precisiontype);
    }

    getShaderSource(shader: WebGLShader): string | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getShaderSource(shader);
    }

    getSupportedExtensions(): string[] | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getSupportedExtensions();
    }

    getTexParameter(target: GLenum, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getTexParameter(target, pname);
    }

    getUniform(program: WebGLProgram, location: WebGLUniformLocation): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getUniform(program, location);
    }

    getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getUniformLocation(program, name);
    }

    getVertexAttrib(index: GLuint, pname: GLenum): any {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getVertexAttrib(index, pname);
    }

    getVertexAttribOffset(index: GLuint, pname: GLenum): GLintptr {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].getVertexAttribOffset(index, pname);
    }

    hint(target: GLenum, mode: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].hint(target, mode);
    }

    isBuffer(buffer: WebGLBuffer | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isBuffer(buffer);
    }

    isContextLost(): boolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isContextLost();
    }

    isEnabled(cap: GLenum): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isEnabled(cap);
    }

    isFramebuffer(framebuffer: WebGLFramebuffer | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isFramebuffer(framebuffer);
    }

    isProgram(program: WebGLProgram | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isProgram(program);
    }

    isRenderbuffer(renderbuffer: WebGLRenderbuffer | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isRenderbuffer(renderbuffer);
    }

    isShader(shader: WebGLShader | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isShader(shader);
    }

    isTexture(texture: WebGLTexture | null): GLboolean {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].isTexture(texture);
    }

    lineWidth(width: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].lineWidth(width);
    }

    linkProgram(program: WebGLProgram): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].linkProgram(program);
    }

    pixelStorei(pname: GLenum, param: GLint | GLboolean): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].pixelStorei(pname, param);
    }

    polygonOffset(factor: GLfloat, units: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].polygonOffset(factor, units);
    }

    renderbufferStorage(target: GLenum, internalformat: GLenum, width: GLsizei, height: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].renderbufferStorage(target, internalformat, width, height);
    }

    sampleCoverage(value: GLclampf, invert: GLboolean): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].sampleCoverage(value, invert);
    }

    scissor(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].scissor(x, y, width, height);
    }

    shaderSource(shader: WebGLShader, source: string): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].shaderSource(shader, source);
    }

    stencilFunc(func: GLenum, ref: GLint, mask: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].stencilFunc(func, ref, mask);
    }

    stencilFuncSeparate(face: GLenum, func: GLenum, ref: GLint, mask: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].stencilFuncSeparate(face, func, ref, mask);
    }

    stencilMask(mask: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].stencilMask(mask);
    }

    stencilMaskSeparate(face: GLenum, mask: GLuint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].stencilMaskSeparate(face, mask);
    }

    stencilOp(fail: GLenum, zfail: GLenum, zpass: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].stencilOp(fail, zfail, zpass);
    }

    stencilOpSeparate(face: GLenum, fail: GLenum, zfail: GLenum, zpass: GLenum): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].stencilOpSeparate(face, fail, zfail, zpass);
    }

    texParameterf(target: GLenum, pname: GLenum, param: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].texParameterf(target, pname, param);
    }

    texParameteri(target: GLenum, pname: GLenum, param: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].texParameteri(target, pname, param);
    }

    uniform1f(location: WebGLUniformLocation | null, x: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform1f(location, x);
    }

    uniform1i(location: WebGLUniformLocation | null, x: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform1i(location, x);
    }

    uniform2f(location: WebGLUniformLocation | null, x: GLfloat, y: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform2f(location, x, y);
    }

    uniform2i(location: WebGLUniformLocation | null, x: GLint, y: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform2i(location, x, y);
    }

    uniform3f(location: WebGLUniformLocation | null, x: GLfloat, y: GLfloat, z: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform3f(location, x, y, z);
    }

    uniform3i(location: WebGLUniformLocation | null, x: GLint, y: GLint, z: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform3i(location, x, y, z);
    }

    uniform4f(location: WebGLUniformLocation | null, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform4f(location, x, y, z, w);
    }

    uniform4i(location: WebGLUniformLocation | null, x: GLint, y: GLint, z: GLint, w: GLint): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].uniform4i(location, x, y, z, w);
    }

    useProgram(program: WebGLProgram | null): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].useProgram(program);
    }

    validateProgram(program: WebGLProgram): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].validateProgram(program);
    }

    vertexAttrib1f(index: GLuint, x: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttrib1f(index, x);
    }

    vertexAttrib1fv(index: GLuint, values: Float32List): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttrib1fv(index, values);
    }

    vertexAttrib2f(index: GLuint, x: GLfloat, y: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttrib2f(index, x, y);
    }

    vertexAttrib2fv(index: GLuint, values: Float32List): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttrib2fv(index, values);
    }

    vertexAttrib3f(index: GLuint, x: GLfloat, y: GLfloat, z: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttrib3f(index, x, y, z);
    }

    vertexAttrib3fv(index: GLuint, values: Float32List): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttrib3fv(index, values);
    }

    vertexAttrib4f(index: GLuint, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttrib4f(index, x, y, z, w);
    }

    vertexAttrib4fv(index: GLuint, values: Float32List): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttrib4fv(index, values);
    }

    vertexAttribPointer(index: GLuint, size: GLint, type: GLenum, normalized: GLboolean, stride: GLsizei, offset: GLintptr): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].vertexAttribPointer(index, size, type, normalized, stride, offset);
    }

    viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].viewport(x, y, width, height);
    }

    makeXRCompatible(): Promise<void> {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].makeXRCompatible();
    }

    /** WebGLRenderingContextBase accessors */
    get canvas(): HTMLCanvasElement | OffscreenCanvas {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].canvas;
    }

    get drawingBufferColorSpace(): PredefinedColorSpace {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawingBufferColorSpace;
    }

    set drawingBufferColorSpace(drawingBufferColorSpace: PredefinedColorSpace) {
        this[RENDERING_CONTEXT_UNWRAP_KEY].drawingBufferColorSpace = drawingBufferColorSpace;
    }

    get drawingBufferHeight(): GLsizei {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawingBufferHeight;
    }

    get drawingBufferWidth(): GLsizei {
        return this[RENDERING_CONTEXT_UNWRAP_KEY].drawingBufferWidth;
    }

    /** WebGL2RenderingContextBase constants */
    readonly READ_BUFFER = 0x0C02;
    readonly UNPACK_ROW_LENGTH = 0x0CF2;
    readonly UNPACK_SKIP_ROWS = 0x0CF3;
    readonly UNPACK_SKIP_PIXELS = 0x0CF4;
    readonly PACK_ROW_LENGTH = 0x0D02;
    readonly PACK_SKIP_ROWS = 0x0D03;
    readonly PACK_SKIP_PIXELS = 0x0D04;
    readonly COLOR = 0x1800;
    readonly DEPTH = 0x1801;
    readonly STENCIL = 0x1802;
    readonly RED = 0x1903;
    readonly RGB8 = 0x8051;
    readonly RGBA8 = 0x8058;
    readonly RGB10_A2 = 0x8059;
    readonly TEXTURE_BINDING_3D = 0x806A;
    readonly UNPACK_SKIP_IMAGES = 0x806D;
    readonly UNPACK_IMAGE_HEIGHT = 0x806E;
    readonly TEXTURE_3D = 0x806F;
    readonly TEXTURE_WRAP_R = 0x8072;
    readonly MAX_3D_TEXTURE_SIZE = 0x8073;
    readonly UNSIGNED_INT_2_10_10_10_REV = 0x8368;
    readonly MAX_ELEMENTS_VERTICES = 0x80E8;
    readonly MAX_ELEMENTS_INDICES = 0x80E9;
    readonly TEXTURE_MIN_LOD = 0x813A;
    readonly TEXTURE_MAX_LOD = 0x813B;
    readonly TEXTURE_BASE_LEVEL = 0x813C;
    readonly TEXTURE_MAX_LEVEL = 0x813D;
    readonly MIN = 0x8007;
    readonly MAX = 0x8008;
    readonly DEPTH_COMPONENT24 = 0x81A6;
    readonly MAX_TEXTURE_LOD_BIAS = 0x84FD;
    readonly TEXTURE_COMPARE_MODE = 0x884C;
    readonly TEXTURE_COMPARE_FUNC = 0x884D;
    readonly CURRENT_QUERY = 0x8865;
    readonly QUERY_RESULT = 0x8866;
    readonly QUERY_RESULT_AVAILABLE = 0x8867;
    readonly STREAM_READ = 0x88E1;
    readonly STREAM_COPY = 0x88E2;
    readonly STATIC_READ = 0x88E5;
    readonly STATIC_COPY = 0x88E6;
    readonly DYNAMIC_READ = 0x88E9;
    readonly DYNAMIC_COPY = 0x88EA;
    readonly MAX_DRAW_BUFFERS = 0x8824;
    readonly DRAW_BUFFER0 = 0x8825;
    readonly DRAW_BUFFER1 = 0x8826;
    readonly DRAW_BUFFER2 = 0x8827;
    readonly DRAW_BUFFER3 = 0x8828;
    readonly DRAW_BUFFER4 = 0x8829;
    readonly DRAW_BUFFER5 = 0x882A;
    readonly DRAW_BUFFER6 = 0x882B;
    readonly DRAW_BUFFER7 = 0x882C;
    readonly DRAW_BUFFER8 = 0x882D;
    readonly DRAW_BUFFER9 = 0x882E;
    readonly DRAW_BUFFER10 = 0x882F;
    readonly DRAW_BUFFER11 = 0x8830;
    readonly DRAW_BUFFER12 = 0x8831;
    readonly DRAW_BUFFER13 = 0x8832;
    readonly DRAW_BUFFER14 = 0x8833;
    readonly DRAW_BUFFER15 = 0x8834;
    readonly MAX_FRAGMENT_UNIFORM_COMPONENTS = 0x8B49;
    readonly MAX_VERTEX_UNIFORM_COMPONENTS = 0x8B4A;
    readonly SAMPLER_3D = 0x8B5F;
    readonly SAMPLER_2D_SHADOW = 0x8B62;
    readonly FRAGMENT_SHADER_DERIVATIVE_HINT = 0x8B8B;
    readonly PIXEL_PACK_BUFFER = 0x88EB;
    readonly PIXEL_UNPACK_BUFFER = 0x88EC;
    readonly PIXEL_PACK_BUFFER_BINDING = 0x88ED;
    readonly PIXEL_UNPACK_BUFFER_BINDING = 0x88EF;
    readonly FLOAT_MAT2x3 = 0x8B65;
    readonly FLOAT_MAT2x4 = 0x8B66;
    readonly FLOAT_MAT3x2 = 0x8B67;
    readonly FLOAT_MAT3x4 = 0x8B68;
    readonly FLOAT_MAT4x2 = 0x8B69;
    readonly FLOAT_MAT4x3 = 0x8B6A;
    readonly SRGB = 0x8C40;
    readonly SRGB8 = 0x8C41;
    readonly SRGB8_ALPHA8 = 0x8C43;
    readonly COMPARE_REF_TO_TEXTURE = 0x884E;
    readonly RGBA32F = 0x8814;
    readonly RGB32F = 0x8815;
    readonly RGBA16F = 0x881A;
    readonly RGB16F = 0x881B;
    readonly VERTEX_ATTRIB_ARRAY_INTEGER = 0x88FD;
    readonly MAX_ARRAY_TEXTURE_LAYERS = 0x88FF;
    readonly MIN_PROGRAM_TEXEL_OFFSET = 0x8904;
    readonly MAX_PROGRAM_TEXEL_OFFSET = 0x8905;
    readonly MAX_VARYING_COMPONENTS = 0x8B4B;
    readonly TEXTURE_2D_ARRAY = 0x8C1A;
    readonly TEXTURE_BINDING_2D_ARRAY = 0x8C1D;
    readonly R11F_G11F_B10F = 0x8C3A;
    readonly UNSIGNED_INT_10F_11F_11F_REV = 0x8C3B;
    readonly RGB9_E5 = 0x8C3D;
    readonly UNSIGNED_INT_5_9_9_9_REV = 0x8C3E;
    readonly TRANSFORM_FEEDBACK_BUFFER_MODE = 0x8C7F;
    readonly MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS = 0x8C80;
    readonly TRANSFORM_FEEDBACK_VARYINGS = 0x8C83;
    readonly TRANSFORM_FEEDBACK_BUFFER_START = 0x8C84;
    readonly TRANSFORM_FEEDBACK_BUFFER_SIZE = 0x8C85;
    readonly TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN = 0x8C88;
    readonly RASTERIZER_DISCARD = 0x8C89;
    readonly MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS = 0x8C8A;
    readonly MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS = 0x8C8B;
    readonly INTERLEAVED_ATTRIBS = 0x8C8C;
    readonly SEPARATE_ATTRIBS = 0x8C8D;
    readonly TRANSFORM_FEEDBACK_BUFFER = 0x8C8E;
    readonly TRANSFORM_FEEDBACK_BUFFER_BINDING = 0x8C8F;
    readonly RGBA32UI = 0x8D70;
    readonly RGB32UI = 0x8D71;
    readonly RGBA16UI = 0x8D76;
    readonly RGB16UI = 0x8D77;
    readonly RGBA8UI = 0x8D7C;
    readonly RGB8UI = 0x8D7D;
    readonly RGBA32I = 0x8D82;
    readonly RGB32I = 0x8D83;
    readonly RGBA16I = 0x8D88;
    readonly RGB16I = 0x8D89;
    readonly RGBA8I = 0x8D8E;
    readonly RGB8I = 0x8D8F;
    readonly RED_INTEGER = 0x8D94;
    readonly RGB_INTEGER = 0x8D98;
    readonly RGBA_INTEGER = 0x8D99;
    readonly SAMPLER_2D_ARRAY = 0x8DC1;
    readonly SAMPLER_2D_ARRAY_SHADOW = 0x8DC4;
    readonly SAMPLER_CUBE_SHADOW = 0x8DC5;
    readonly UNSIGNED_INT_VEC2 = 0x8DC6;
    readonly UNSIGNED_INT_VEC3 = 0x8DC7;
    readonly UNSIGNED_INT_VEC4 = 0x8DC8;
    readonly INT_SAMPLER_2D = 0x8DCA;
    readonly INT_SAMPLER_3D = 0x8DCB;
    readonly INT_SAMPLER_CUBE = 0x8DCC;
    readonly INT_SAMPLER_2D_ARRAY = 0x8DCF;
    readonly UNSIGNED_INT_SAMPLER_2D = 0x8DD2;
    readonly UNSIGNED_INT_SAMPLER_3D = 0x8DD3;
    readonly UNSIGNED_INT_SAMPLER_CUBE = 0x8DD4;
    readonly UNSIGNED_INT_SAMPLER_2D_ARRAY = 0x8DD7;
    readonly DEPTH_COMPONENT32F = 0x8CAC;
    readonly DEPTH32F_STENCIL8 = 0x8CAD;
    readonly FLOAT_32_UNSIGNED_INT_24_8_REV = 0x8DAD;
    readonly FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING = 0x8210;
    readonly FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE = 0x8211;
    readonly FRAMEBUFFER_ATTACHMENT_RED_SIZE = 0x8212;
    readonly FRAMEBUFFER_ATTACHMENT_GREEN_SIZE = 0x8213;
    readonly FRAMEBUFFER_ATTACHMENT_BLUE_SIZE = 0x8214;
    readonly FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE = 0x8215;
    readonly FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE = 0x8216;
    readonly FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE = 0x8217;
    readonly FRAMEBUFFER_DEFAULT = 0x8218;
    readonly UNSIGNED_INT_24_8 = 0x84FA;
    readonly DEPTH24_STENCIL8 = 0x88F0;
    readonly UNSIGNED_NORMALIZED = 0x8C17;
    readonly DRAW_FRAMEBUFFER_BINDING = 0x8CA6;
    readonly READ_FRAMEBUFFER = 0x8CA8;
    readonly DRAW_FRAMEBUFFER = 0x8CA9;
    readonly READ_FRAMEBUFFER_BINDING = 0x8CAA;
    readonly RENDERBUFFER_SAMPLES = 0x8CAB;
    readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER = 0x8CD4;
    readonly MAX_COLOR_ATTACHMENTS = 0x8CDF;
    readonly COLOR_ATTACHMENT1 = 0x8CE1;
    readonly COLOR_ATTACHMENT2 = 0x8CE2;
    readonly COLOR_ATTACHMENT3 = 0x8CE3;
    readonly COLOR_ATTACHMENT4 = 0x8CE4;
    readonly COLOR_ATTACHMENT5 = 0x8CE5;
    readonly COLOR_ATTACHMENT6 = 0x8CE6;
    readonly COLOR_ATTACHMENT7 = 0x8CE7;
    readonly COLOR_ATTACHMENT8 = 0x8CE8;
    readonly COLOR_ATTACHMENT9 = 0x8CE9;
    readonly COLOR_ATTACHMENT10 = 0x8CEA;
    readonly COLOR_ATTACHMENT11 = 0x8CEB;
    readonly COLOR_ATTACHMENT12 = 0x8CEC;
    readonly COLOR_ATTACHMENT13 = 0x8CED;
    readonly COLOR_ATTACHMENT14 = 0x8CEE;
    readonly COLOR_ATTACHMENT15 = 0x8CEF;
    readonly FRAMEBUFFER_INCOMPLETE_MULTISAMPLE = 0x8D56;
    readonly MAX_SAMPLES = 0x8D57;
    readonly HALF_FLOAT = 0x140B;
    readonly RG = 0x8227;
    readonly RG_INTEGER = 0x8228;
    readonly R8 = 0x8229;
    readonly RG8 = 0x822B;
    readonly R16F = 0x822D;
    readonly R32F = 0x822E;
    readonly RG16F = 0x822F;
    readonly RG32F = 0x8230;
    readonly R8I = 0x8231;
    readonly R8UI = 0x8232;
    readonly R16I = 0x8233;
    readonly R16UI = 0x8234;
    readonly R32I = 0x8235;
    readonly R32UI = 0x8236;
    readonly RG8I = 0x8237;
    readonly RG8UI = 0x8238;
    readonly RG16I = 0x8239;
    readonly RG16UI = 0x823A;
    readonly RG32I = 0x823B;
    readonly RG32UI = 0x823C;
    readonly VERTEX_ARRAY_BINDING = 0x85B5;
    readonly R8_SNORM = 0x8F94;
    readonly RG8_SNORM = 0x8F95;
    readonly RGB8_SNORM = 0x8F96;
    readonly RGBA8_SNORM = 0x8F97;
    readonly SIGNED_NORMALIZED = 0x8F9C;
    readonly COPY_READ_BUFFER = 0x8F36;
    readonly COPY_WRITE_BUFFER = 0x8F37;
    readonly COPY_READ_BUFFER_BINDING = 0x8F36;
    readonly COPY_WRITE_BUFFER_BINDING = 0x8F37;
    readonly UNIFORM_BUFFER = 0x8A11;
    readonly UNIFORM_BUFFER_BINDING = 0x8A28;
    readonly UNIFORM_BUFFER_START = 0x8A29;
    readonly UNIFORM_BUFFER_SIZE = 0x8A2A;
    readonly MAX_VERTEX_UNIFORM_BLOCKS = 0x8A2B;
    readonly MAX_FRAGMENT_UNIFORM_BLOCKS = 0x8A2D;
    readonly MAX_COMBINED_UNIFORM_BLOCKS = 0x8A2E;
    readonly MAX_UNIFORM_BUFFER_BINDINGS = 0x8A2F;
    readonly MAX_UNIFORM_BLOCK_SIZE = 0x8A30;
    readonly MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS = 0x8A31;
    readonly MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS = 0x8A33;
    readonly UNIFORM_BUFFER_OFFSET_ALIGNMENT = 0x8A34;
    readonly ACTIVE_UNIFORM_BLOCKS = 0x8A36;
    readonly UNIFORM_TYPE = 0x8A37;
    readonly UNIFORM_SIZE = 0x8A38;
    readonly UNIFORM_BLOCK_INDEX = 0x8A3A;
    readonly UNIFORM_OFFSET = 0x8A3B;
    readonly UNIFORM_ARRAY_STRIDE = 0x8A3C;
    readonly UNIFORM_MATRIX_STRIDE = 0x8A3D;
    readonly UNIFORM_IS_ROW_MAJOR = 0x8A3E;
    readonly UNIFORM_BLOCK_BINDING = 0x8A3F;
    readonly UNIFORM_BLOCK_DATA_SIZE = 0x8A40;
    readonly UNIFORM_BLOCK_ACTIVE_UNIFORMS = 0x8A42;
    readonly UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES = 0x8A43;
    readonly UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER = 0x8A44;
    readonly UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER = 0x8A46;
    readonly INVALID_INDEX = 0xFFFFFFFF;
    readonly MAX_VERTEX_OUTPUT_COMPONENTS = 0x9122;
    readonly MAX_FRAGMENT_INPUT_COMPONENTS = 0x9125;
    readonly MAX_SERVER_WAIT_TIMEOUT = 0x9111;
    readonly OBJECT_TYPE = 0x9112;
    readonly SYNC_CONDITION = 0x9113;
    readonly SYNC_STATUS = 0x9114;
    readonly SYNC_FLAGS = 0x9115;
    readonly SYNC_FENCE = 0x9116;
    readonly SYNC_GPU_COMMANDS_COMPLETE = 0x9117;
    readonly UNSIGNALED = 0x9118;
    readonly SIGNALED = 0x9119;
    readonly ALREADY_SIGNALED = 0x911A;
    readonly TIMEOUT_EXPIRED = 0x911B;
    readonly CONDITION_SATISFIED = 0x911C;
    readonly WAIT_FAILED = 0x911D;
    readonly SYNC_FLUSH_COMMANDS_BIT = 0x00000001;
    readonly VERTEX_ATTRIB_ARRAY_DIVISOR = 0x88FE;
    readonly ANY_SAMPLES_PASSED = 0x8C2F;
    readonly ANY_SAMPLES_PASSED_CONSERVATIVE = 0x8D6A;
    readonly SAMPLER_BINDING = 0x8919;
    readonly RGB10_A2UI = 0x906F;
    readonly INT_2_10_10_10_REV = 0x8D9F;
    readonly TRANSFORM_FEEDBACK = 0x8E22;
    readonly TRANSFORM_FEEDBACK_PAUSED = 0x8E23;
    readonly TRANSFORM_FEEDBACK_ACTIVE = 0x8E24;
    readonly TRANSFORM_FEEDBACK_BINDING = 0x8E25;
    readonly TEXTURE_IMMUTABLE_FORMAT = 0x912F;
    readonly MAX_ELEMENT_INDEX = 0x8D6B;
    readonly TEXTURE_IMMUTABLE_LEVELS = 0x82DF;
    readonly TIMEOUT_IGNORED = -1;
    readonly MAX_CLIENT_WAIT_TIMEOUT_WEBGL = 0x9247;

    /** WebGLRenderingContextBase constants */
    readonly DEPTH_BUFFER_BIT = 0x00000100;
    readonly STENCIL_BUFFER_BIT = 0x00000400;
    readonly COLOR_BUFFER_BIT = 0x00004000;
    readonly POINTS = 0x0000;
    readonly LINES = 0x0001;
    readonly LINE_LOOP = 0x0002;
    readonly LINE_STRIP = 0x0003;
    readonly TRIANGLES = 0x0004;
    readonly TRIANGLE_STRIP = 0x0005;
    readonly TRIANGLE_FAN = 0x0006;
    readonly ZERO = 0;
    readonly ONE = 1;
    readonly SRC_COLOR = 0x0300;
    readonly ONE_MINUS_SRC_COLOR = 0x0301;
    readonly SRC_ALPHA = 0x0302;
    readonly ONE_MINUS_SRC_ALPHA = 0x0303;
    readonly DST_ALPHA = 0x0304;
    readonly ONE_MINUS_DST_ALPHA = 0x0305;
    readonly DST_COLOR = 0x0306;
    readonly ONE_MINUS_DST_COLOR = 0x0307;
    readonly SRC_ALPHA_SATURATE = 0x0308;
    readonly FUNC_ADD = 0x8006;
    readonly BLEND_EQUATION = 0x8009;
    readonly BLEND_EQUATION_RGB = 0x8009;
    readonly BLEND_EQUATION_ALPHA = 0x883D;
    readonly FUNC_SUBTRACT = 0x800A;
    readonly FUNC_REVERSE_SUBTRACT = 0x800B;
    readonly BLEND_DST_RGB = 0x80C8;
    readonly BLEND_SRC_RGB = 0x80C9;
    readonly BLEND_DST_ALPHA = 0x80CA;
    readonly BLEND_SRC_ALPHA = 0x80CB;
    readonly CONSTANT_COLOR = 0x8001;
    readonly ONE_MINUS_CONSTANT_COLOR = 0x8002;
    readonly CONSTANT_ALPHA = 0x8003;
    readonly ONE_MINUS_CONSTANT_ALPHA = 0x8004;
    readonly BLEND_COLOR = 0x8005;
    readonly ARRAY_BUFFER = 0x8892;
    readonly ELEMENT_ARRAY_BUFFER = 0x8893;
    readonly ARRAY_BUFFER_BINDING = 0x8894;
    readonly ELEMENT_ARRAY_BUFFER_BINDING = 0x8895;
    readonly STREAM_DRAW = 0x88E0;
    readonly STATIC_DRAW = 0x88E4;
    readonly DYNAMIC_DRAW = 0x88E8;
    readonly BUFFER_SIZE = 0x8764;
    readonly BUFFER_USAGE = 0x8765;
    readonly CURRENT_VERTEX_ATTRIB = 0x8626;
    readonly FRONT = 0x0404;
    readonly BACK = 0x0405;
    readonly FRONT_AND_BACK = 0x0408;
    readonly CULL_FACE = 0x0B44;
    readonly BLEND = 0x0BE2;
    readonly DITHER = 0x0BD0;
    readonly STENCIL_TEST = 0x0B90;
    readonly DEPTH_TEST = 0x0B71;
    readonly SCISSOR_TEST = 0x0C11;
    readonly POLYGON_OFFSET_FILL = 0x8037;
    readonly SAMPLE_ALPHA_TO_COVERAGE = 0x809E;
    readonly SAMPLE_COVERAGE = 0x80A0;
    readonly NO_ERROR = 0;
    readonly INVALID_ENUM = 0x0500;
    readonly INVALID_VALUE = 0x0501;
    readonly INVALID_OPERATION = 0x0502;
    readonly OUT_OF_MEMORY = 0x0505;
    readonly CW = 0x0900;
    readonly CCW = 0x0901;
    readonly LINE_WIDTH = 0x0B21;
    readonly ALIASED_POINT_SIZE_RANGE = 0x846D;
    readonly ALIASED_LINE_WIDTH_RANGE = 0x846E;
    readonly CULL_FACE_MODE = 0x0B45;
    readonly FRONT_FACE = 0x0B46;
    readonly DEPTH_RANGE = 0x0B70;
    readonly DEPTH_WRITEMASK = 0x0B72;
    readonly DEPTH_CLEAR_VALUE = 0x0B73;
    readonly DEPTH_FUNC = 0x0B74;
    readonly STENCIL_CLEAR_VALUE = 0x0B91;
    readonly STENCIL_FUNC = 0x0B92;
    readonly STENCIL_FAIL = 0x0B94;
    readonly STENCIL_PASS_DEPTH_FAIL = 0x0B95;
    readonly STENCIL_PASS_DEPTH_PASS = 0x0B96;
    readonly STENCIL_REF = 0x0B97;
    readonly STENCIL_VALUE_MASK = 0x0B93;
    readonly STENCIL_WRITEMASK = 0x0B98;
    readonly STENCIL_BACK_FUNC = 0x8800;
    readonly STENCIL_BACK_FAIL = 0x8801;
    readonly STENCIL_BACK_PASS_DEPTH_FAIL = 0x8802;
    readonly STENCIL_BACK_PASS_DEPTH_PASS = 0x8803;
    readonly STENCIL_BACK_REF = 0x8CA3;
    readonly STENCIL_BACK_VALUE_MASK = 0x8CA4;
    readonly STENCIL_BACK_WRITEMASK = 0x8CA5;
    readonly VIEWPORT = 0x0BA2;
    readonly SCISSOR_BOX = 0x0C10;
    readonly COLOR_CLEAR_VALUE = 0x0C22;
    readonly COLOR_WRITEMASK = 0x0C23;
    readonly UNPACK_ALIGNMENT = 0x0CF5;
    readonly PACK_ALIGNMENT = 0x0D05;
    readonly MAX_TEXTURE_SIZE = 0x0D33;
    readonly MAX_VIEWPORT_DIMS = 0x0D3A;
    readonly SUBPIXEL_BITS = 0x0D50;
    readonly RED_BITS = 0x0D52;
    readonly GREEN_BITS = 0x0D53;
    readonly BLUE_BITS = 0x0D54;
    readonly ALPHA_BITS = 0x0D55;
    readonly DEPTH_BITS = 0x0D56;
    readonly STENCIL_BITS = 0x0D57;
    readonly POLYGON_OFFSET_UNITS = 0x2A00;
    readonly POLYGON_OFFSET_FACTOR = 0x8038;
    readonly TEXTURE_BINDING_2D = 0x8069;
    readonly SAMPLE_BUFFERS = 0x80A8;
    readonly SAMPLES = 0x80A9;
    readonly SAMPLE_COVERAGE_VALUE = 0x80AA;
    readonly SAMPLE_COVERAGE_INVERT = 0x80AB;
    readonly COMPRESSED_TEXTURE_FORMATS = 0x86A3;
    readonly DONT_CARE = 0x1100;
    readonly FASTEST = 0x1101;
    readonly NICEST = 0x1102;
    readonly GENERATE_MIPMAP_HINT = 0x8192;
    readonly BYTE = 0x1400;
    readonly UNSIGNED_BYTE = 0x1401;
    readonly SHORT = 0x1402;
    readonly UNSIGNED_SHORT = 0x1403;
    readonly INT = 0x1404;
    readonly UNSIGNED_INT = 0x1405;
    readonly FLOAT = 0x1406;
    readonly DEPTH_COMPONENT = 0x1902;
    readonly ALPHA = 0x1906;
    readonly RGB = 0x1907;
    readonly RGBA = 0x1908;
    readonly LUMINANCE = 0x1909;
    readonly LUMINANCE_ALPHA = 0x190A;
    readonly UNSIGNED_SHORT_4_4_4_4 = 0x8033;
    readonly UNSIGNED_SHORT_5_5_5_1 = 0x8034;
    readonly UNSIGNED_SHORT_5_6_5 = 0x8363;
    readonly FRAGMENT_SHADER = 0x8B30;
    readonly VERTEX_SHADER = 0x8B31;
    readonly MAX_VERTEX_ATTRIBS = 0x8869;
    readonly MAX_VERTEX_UNIFORM_VECTORS = 0x8DFB;
    readonly MAX_VARYING_VECTORS = 0x8DFC;
    readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;
    readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8B4C;
    readonly MAX_TEXTURE_IMAGE_UNITS = 0x8872;
    readonly MAX_FRAGMENT_UNIFORM_VECTORS = 0x8DFD;
    readonly SHADER_TYPE = 0x8B4F;
    readonly DELETE_STATUS = 0x8B80;
    readonly LINK_STATUS = 0x8B82;
    readonly VALIDATE_STATUS = 0x8B83;
    readonly ATTACHED_SHADERS = 0x8B85;
    readonly ACTIVE_UNIFORMS = 0x8B86;
    readonly ACTIVE_ATTRIBUTES = 0x8B89;
    readonly SHADING_LANGUAGE_VERSION = 0x8B8C;
    readonly CURRENT_PROGRAM = 0x8B8D;
    readonly NEVER = 0x0200;
    readonly LESS = 0x0201;
    readonly EQUAL = 0x0202;
    readonly LEQUAL = 0x0203;
    readonly GREATER = 0x0204;
    readonly NOTEQUAL = 0x0205;
    readonly GEQUAL = 0x0206;
    readonly ALWAYS = 0x0207;
    readonly KEEP = 0x1E00;
    readonly REPLACE = 0x1E01;
    readonly INCR = 0x1E02;
    readonly DECR = 0x1E03;
    readonly INVERT = 0x150A;
    readonly INCR_WRAP = 0x8507;
    readonly DECR_WRAP = 0x8508;
    readonly VENDOR = 0x1F00;
    readonly RENDERER = 0x1F01;
    readonly VERSION = 0x1F02;
    readonly NEAREST = 0x2600;
    readonly LINEAR = 0x2601;
    readonly NEAREST_MIPMAP_NEAREST = 0x2700;
    readonly LINEAR_MIPMAP_NEAREST = 0x2701;
    readonly NEAREST_MIPMAP_LINEAR = 0x2702;
    readonly LINEAR_MIPMAP_LINEAR = 0x2703;
    readonly TEXTURE_MAG_FILTER = 0x2800;
    readonly TEXTURE_MIN_FILTER = 0x2801;
    readonly TEXTURE_WRAP_S = 0x2802;
    readonly TEXTURE_WRAP_T = 0x2803;
    readonly TEXTURE_2D = 0x0DE1;
    readonly TEXTURE = 0x1702;
    readonly TEXTURE_CUBE_MAP = 0x8513;
    readonly TEXTURE_BINDING_CUBE_MAP = 0x8514;
    readonly TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
    readonly TEXTURE_CUBE_MAP_NEGATIVE_X = 0x8516;
    readonly TEXTURE_CUBE_MAP_POSITIVE_Y = 0x8517;
    readonly TEXTURE_CUBE_MAP_NEGATIVE_Y = 0x8518;
    readonly TEXTURE_CUBE_MAP_POSITIVE_Z = 0x8519;
    readonly TEXTURE_CUBE_MAP_NEGATIVE_Z = 0x851A;
    readonly MAX_CUBE_MAP_TEXTURE_SIZE = 0x851C;
    readonly TEXTURE0 = 0x84C0;
    readonly TEXTURE1 = 0x84C1;
    readonly TEXTURE2 = 0x84C2;
    readonly TEXTURE3 = 0x84C3;
    readonly TEXTURE4 = 0x84C4;
    readonly TEXTURE5 = 0x84C5;
    readonly TEXTURE6 = 0x84C6;
    readonly TEXTURE7 = 0x84C7;
    readonly TEXTURE8 = 0x84C8;
    readonly TEXTURE9 = 0x84C9;
    readonly TEXTURE10 = 0x84CA;
    readonly TEXTURE11 = 0x84CB;
    readonly TEXTURE12 = 0x84CC;
    readonly TEXTURE13 = 0x84CD;
    readonly TEXTURE14 = 0x84CE;
    readonly TEXTURE15 = 0x84CF;
    readonly TEXTURE16 = 0x84D0;
    readonly TEXTURE17 = 0x84D1;
    readonly TEXTURE18 = 0x84D2;
    readonly TEXTURE19 = 0x84D3;
    readonly TEXTURE20 = 0x84D4;
    readonly TEXTURE21 = 0x84D5;
    readonly TEXTURE22 = 0x84D6;
    readonly TEXTURE23 = 0x84D7;
    readonly TEXTURE24 = 0x84D8;
    readonly TEXTURE25 = 0x84D9;
    readonly TEXTURE26 = 0x84DA;
    readonly TEXTURE27 = 0x84DB;
    readonly TEXTURE28 = 0x84DC;
    readonly TEXTURE29 = 0x84DD;
    readonly TEXTURE30 = 0x84DE;
    readonly TEXTURE31 = 0x84DF;
    readonly ACTIVE_TEXTURE = 0x84E0;
    readonly REPEAT = 0x2901;
    readonly CLAMP_TO_EDGE = 0x812F;
    readonly MIRRORED_REPEAT = 0x8370;
    readonly FLOAT_VEC2 = 0x8B50;
    readonly FLOAT_VEC3 = 0x8B51;
    readonly FLOAT_VEC4 = 0x8B52;
    readonly INT_VEC2 = 0x8B53;
    readonly INT_VEC3 = 0x8B54;
    readonly INT_VEC4 = 0x8B55;
    readonly BOOL = 0x8B56;
    readonly BOOL_VEC2 = 0x8B57;
    readonly BOOL_VEC3 = 0x8B58;
    readonly BOOL_VEC4 = 0x8B59;
    readonly FLOAT_MAT2 = 0x8B5A;
    readonly FLOAT_MAT3 = 0x8B5B;
    readonly FLOAT_MAT4 = 0x8B5C;
    readonly SAMPLER_2D = 0x8B5E;
    readonly SAMPLER_CUBE = 0x8B60;
    readonly VERTEX_ATTRIB_ARRAY_ENABLED = 0x8622;
    readonly VERTEX_ATTRIB_ARRAY_SIZE = 0x8623;
    readonly VERTEX_ATTRIB_ARRAY_STRIDE = 0x8624;
    readonly VERTEX_ATTRIB_ARRAY_TYPE = 0x8625;
    readonly VERTEX_ATTRIB_ARRAY_NORMALIZED = 0x886A;
    readonly VERTEX_ATTRIB_ARRAY_POINTER = 0x8645;
    readonly VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 0x889F;
    readonly IMPLEMENTATION_COLOR_READ_TYPE = 0x8B9A;
    readonly IMPLEMENTATION_COLOR_READ_FORMAT = 0x8B9B;
    readonly COMPILE_STATUS = 0x8B81;
    readonly LOW_FLOAT = 0x8DF0;
    readonly MEDIUM_FLOAT = 0x8DF1;
    readonly HIGH_FLOAT = 0x8DF2;
    readonly LOW_INT = 0x8DF3;
    readonly MEDIUM_INT = 0x8DF4;
    readonly HIGH_INT = 0x8DF5;
    readonly FRAMEBUFFER = 0x8D40;
    readonly RENDERBUFFER = 0x8D41;
    readonly RGBA4 = 0x8056;
    readonly RGB5_A1 = 0x8057;
    readonly RGB565 = 0x8D62;
    readonly DEPTH_COMPONENT16 = 0x81A5;
    readonly STENCIL_INDEX8 = 0x8D48;
    readonly DEPTH_STENCIL = 0x84F9;
    readonly RENDERBUFFER_WIDTH = 0x8D42;
    readonly RENDERBUFFER_HEIGHT = 0x8D43;
    readonly RENDERBUFFER_INTERNAL_FORMAT = 0x8D44;
    readonly RENDERBUFFER_RED_SIZE = 0x8D50;
    readonly RENDERBUFFER_GREEN_SIZE = 0x8D51;
    readonly RENDERBUFFER_BLUE_SIZE = 0x8D52;
    readonly RENDERBUFFER_ALPHA_SIZE = 0x8D53;
    readonly RENDERBUFFER_DEPTH_SIZE = 0x8D54;
    readonly RENDERBUFFER_STENCIL_SIZE = 0x8D55;
    readonly FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 0x8CD0;
    readonly FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 0x8CD1;
    readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 0x8CD2;
    readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 0x8CD3;
    readonly COLOR_ATTACHMENT0 = 0x8CE0;
    readonly DEPTH_ATTACHMENT = 0x8D00;
    readonly STENCIL_ATTACHMENT = 0x8D20;
    readonly DEPTH_STENCIL_ATTACHMENT = 0x821A;
    readonly NONE = 0;
    readonly FRAMEBUFFER_COMPLETE = 0x8CD5;
    readonly FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8CD6;
    readonly FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8CD7;
    readonly FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 0x8CD9;
    readonly FRAMEBUFFER_UNSUPPORTED = 0x8CDD;
    readonly FRAMEBUFFER_BINDING = 0x8CA6;
    readonly RENDERBUFFER_BINDING = 0x8CA7;
    readonly MAX_RENDERBUFFER_SIZE = 0x84E8;
    readonly INVALID_FRAMEBUFFER_OPERATION = 0x0506;
    readonly UNPACK_FLIP_Y_WEBGL = 0x9240;
    readonly UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
    readonly CONTEXT_LOST_WEBGL = 0x9242;
    readonly UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;
    readonly BROWSER_DEFAULT_WEBGL = 0x9244;
}