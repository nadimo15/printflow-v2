import { Router, Request, Response } from 'express';
import { insforge } from '../config/insforge';

const router = Router();

// Login using InsForge
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
      });
    }

    // Sign in using InsForge Auth
    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data) {
      console.error('InsForge Login Error:', error);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: error?.message || 'Login failed' }
      });
    }

    // Fetch user profile from 'profiles' table
    const { data: profile } = await insforge.database
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const metadata = (data.user as any).metadata || {};

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          role: profile?.role || metadata?.role || 'worker',
          name: profile?.name || metadata?.name,
          ...profile,
        },
        token: data.accessToken,
      },
    });
  } catch (error: any) {
    console.error('Login Route Exception:', error);
    res.status(500).json({
      success: false,
      error: { code: 'LOGIN_ERROR', message: error.message || 'Internal Server Error' },
    });
  }
});

// Register using InsForge
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required' },
      });
    }

    // 1. Create Auth User
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
    });

    if (error) {
      console.error('InsForge Register Error:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'REGISTER_ERROR', message: error.message },
      });
    }

    if (data?.user) {
      // 2. Create Profile in 'profiles' table
      const { error: profileError } = await insforge.database
        .from('profiles')
        .insert([{
          id: data.user.id,
          name,
          email,
          role: role || 'worker',
          is_active: true
        }]);

      if (profileError) {
        console.warn('Failed to create profile in DB:', profileError);
      }
    }

    res.status(201).json({ success: true, data: data?.user || null });
  } catch (error: any) {
    console.error('Register Route Exception:', error);
    res.status(400).json({
      success: false,
      error: { code: 'REGISTER_ERROR', message: error.message },
    });
  }
});

export default router;
