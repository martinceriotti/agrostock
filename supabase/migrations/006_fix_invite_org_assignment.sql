-- El trigger handle_new_user no leía organization_id del metadata del invite.
-- Cuando se invita a un usuario, el trigger crea el perfil con org_id = null.
-- Este fix hace que el trigger también lea organization_id del metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'engineer'),
    (NEW.raw_user_meta_data->>'organization_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
