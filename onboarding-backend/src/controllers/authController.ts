import type { Request, Response, NextFunction } from 'express';

export const googleCallback = (req: Request, res: Response) => {
    res.redirect('/dashboard?login=success');
};

export const loginSuccess = (req: Request, res: Response) => {
    if (req.user) {
        res.status(200).json({
            success: true,
            message: "successful",
            user: req.user,
        });
    } else {
        res.status(401).json({
            success: false,
            message: "failure",
        });
    }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
};
