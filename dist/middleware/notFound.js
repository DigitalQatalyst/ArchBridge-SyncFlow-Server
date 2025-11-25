"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = void 0;
// 404 Not Found middleware
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
};
exports.notFound = notFound;
//# sourceMappingURL=notFound.js.map